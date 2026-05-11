# v0.1.0
# { "Depends": "py-genlayer:test" }
"""
DecentraHire — decentralized freelance jobs board on GenLayer.

Lifecycle:
  OPEN -> ACCEPTED -> SUBMITTED -> (RELEASED | DISPUTED -> RESOLVED) | CANCELLED

The frontend (src/hooks/useContract.ts + useQueries.ts) calls:
  Writes : deposit_funds, withdraw_funds, post_job, accept_job,
           submit_deliverable, evaluate_deliverable, raise_dispute,
           resolve_dispute, cancel_job
  Views  : get_all_jobs, get_job, get_reputation, get_balance, get_job_count

AI evaluation is performed by GenLayer's optimistic-democracy consensus via
`gl.nondet.exec_prompt` inside `gl.vm.run_nondet_unsafe`, mirroring the
audit_escrow.py / dev_bounty.py patterns from dotmantissa/GenLayer.
"""

from genlayer import *
import json

# ── Error tags (mirroring reference contracts) ──────────────────────────────
ERROR_EXPECTED  = "[EXPECTED]"
ERROR_EXTERNAL  = "[EXTERNAL]"
ERROR_TRANSIENT = "[TRANSIENT]"
ERROR_LLM       = "[LLM_ERROR]"

DISPUTE_WINDOW = 259200  # 72h to dispute after submission


@allow_storage
@dataclass
class Job:
    job_id: str
    client: str
    worker: str            # "" until accepted
    title: str
    description: str
    criteria: str          # acceptance criteria the AI evaluates against
    payment: u256          # locked from client balance on post
    deliverable_url: str   # "" until submit_deliverable
    status: str            # OPEN | ACCEPTED | SUBMITTED | RELEASED | DISPUTED | RESOLVED | CANCELLED
    created_at: u256
    submitted_at: u256
    dispute_reason: str
    ai_verdict: str        # last AI evaluation summary (JSON)


@allow_storage
@dataclass
class Rep:
    address: str
    jobs_completed: u256
    jobs_posted: u256
    disputes_won: u256
    disputes_lost: u256
    total_earned: u256


class DecentraHire(gl.Contract):
    admin: Address
    counter: u256
    jobs: TreeMap[str, Job]
    job_order: DynArray[str]
    balances: TreeMap[str, u256]   # claimable + spendable balance per wallet
    reputations: TreeMap[str, Rep]

    def __init__(self):
        self.admin = gl.message.sender_account
        self.counter = u256(0)

    # ── Private helpers ─────────────────────────────────────────────────────

    def _addr(self, raw) -> str:
        return str(raw).strip().lower()

    def _next_id(self) -> str:
        n = int(self.counter) + 1
        self.counter = u256(n)
        return f"job-{n}"

    def _balance_of(self, who: str) -> int:
        return int(self.balances[who]) if who in self.balances else 0

    def _credit(self, who: str, amount: int) -> None:
        if amount <= 0:
            return
        self.balances[who] = u256(self._balance_of(who) + amount)

    def _debit(self, who: str, amount: int) -> None:
        bal = self._balance_of(who)
        if bal < amount:
            raise gl.vm.UserError(
                f"{ERROR_EXPECTED} Insufficient balance "
                f"(have {bal}, need {amount}) for {who}"
            )
        self.balances[who] = u256(bal - amount)

    def _rep(self, who: str) -> Rep:
        if who in self.reputations:
            return self.reputations[who]
        return Rep(
            address=who,
            jobs_completed=u256(0),
            jobs_posted=u256(0),
            disputes_won=u256(0),
            disputes_lost=u256(0),
            total_earned=u256(0),
        )

    def _save_rep(self, r: Rep) -> None:
        self.reputations[r.address] = r

    def _require_admin(self) -> None:
        if self._addr(gl.message.sender_account) != self._addr(self.admin):
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Only admin can call this")

    def _fetch_deliverable(self, url: str) -> str:
        try:
            res = gl.nondet.web.get(url)
            if res.status == 404:
                raise gl.vm.UserError(f"{ERROR_EXTERNAL} Deliverable URL returned 404")
            if res.status >= 500:
                raise gl.vm.UserError(
                    f"{ERROR_TRANSIENT} Deliverable host unavailable ({res.status})"
                )
            if res.status >= 400:
                raise gl.vm.UserError(
                    f"{ERROR_EXTERNAL} Deliverable URL error ({res.status})"
                )
            return res.body.decode("utf-8", errors="replace")[:8000]
        except gl.vm.UserError:
            raise
        except Exception as e:
            raise gl.vm.UserError(
                f"{ERROR_TRANSIENT} Failed to fetch deliverable: {e}"
            )

    # ── Funds ───────────────────────────────────────────────────────────────

    @gl.public.write
    def deposit_funds(self, amount: int) -> None:
        """Credit the caller's internal balance. Emits: [Deposit]"""
        amt = int(amount)
        if amt <= 0:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} amount must be positive")
        who = self._addr(gl.message.sender_account)
        self._credit(who, amt)
        print(f"[Deposit] wallet={who} amount={amt}")

    @gl.public.write
    def withdraw_funds(self, amount: int) -> None:
        """Debit the caller's balance. Emits: [Withdraw]"""
        amt = int(amount)
        if amt <= 0:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} amount must be positive")
        who = self._addr(gl.message.sender_account)
        self._debit(who, amt)
        print(f"[Withdraw] wallet={who} amount={amt}")

    # ── Job lifecycle ───────────────────────────────────────────────────────

    @gl.public.write
    def post_job(
        self,
        title: str,
        description: str,
        criteria: str,
        payment: int,
    ) -> str:
        """
        Client posts a job and locks `payment` from their balance into escrow.
        Returns the new job_id. Emits: [JobPosted]
        """
        t = str(title).strip()
        d = str(description).strip()
        c = str(criteria).strip()
        pay = int(payment)

        if not t:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} title cannot be empty")
        if not d:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} description cannot be empty")
        if not c:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} criteria cannot be empty")
        if pay <= 0:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} payment must be positive")

        client = self._addr(gl.message.sender_account)
        self._debit(client, pay)  # lock funds

        job_id = self._next_id()
        now = int(gl.block.timestamp)
        self.jobs[job_id] = Job(
            job_id=job_id,
            client=client,
            worker="",
            title=t[:200],
            description=d[:2000],
            criteria=c[:1000],
            payment=u256(pay),
            deliverable_url="",
            status="OPEN",
            created_at=u256(now),
            submitted_at=u256(0),
            dispute_reason="",
            ai_verdict="",
        )
        self.job_order.append(job_id)

        r = self._rep(client)
        r.jobs_posted = u256(int(r.jobs_posted) + 1)
        self._save_rep(r)

        print(f"[JobPosted] id={job_id} client={client} payment={pay}")
        return job_id

    @gl.public.write
    def accept_job(self, job_id: str) -> None:
        """Worker accepts an OPEN job. Emits: [JobAccepted]"""
        jid = str(job_id).strip()
        if jid not in self.jobs:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Job {jid} not found")
        job = self.jobs[jid]
        worker = self._addr(gl.message.sender_account)

        if job.status != "OPEN":
            raise gl.vm.UserError(
                f"{ERROR_EXPECTED} Job not OPEN (status: {job.status})"
            )
        if worker == job.client:
            raise gl.vm.UserError(
                f"{ERROR_EXPECTED} Client cannot accept their own job"
            )

        job.worker = worker
        job.status = "ACCEPTED"
        self.jobs[jid] = job
        print(f"[JobAccepted] id={jid} worker={worker}")

    @gl.public.write
    def submit_deliverable(self, job_id: str, url: str) -> None:
        """Worker submits a URL pointing to the deliverable. Emits: [DeliverableSubmitted]"""
        jid = str(job_id).strip()
        if jid not in self.jobs:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Job {jid} not found")
        job = self.jobs[jid]
        caller = self._addr(gl.message.sender_account)

        if caller != job.worker:
            raise gl.vm.UserError(
                f"{ERROR_EXPECTED} Only the assigned worker can submit"
            )
        if job.status != "ACCEPTED":
            raise gl.vm.UserError(
                f"{ERROR_EXPECTED} Job must be ACCEPTED (status: {job.status})"
            )
        u = str(url).strip()
        if not u:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} url cannot be empty")

        job.deliverable_url = u[:500]
        job.status = "SUBMITTED"
        job.submitted_at = u256(int(gl.block.timestamp))
        self.jobs[jid] = job
        print(f"[DeliverableSubmitted] id={jid} url={u[:80]}")

    @gl.public.write
    def evaluate_deliverable(self, job_id: str) -> str:
        """
        Client triggers AI evaluation. If the deliverable meets the criteria,
        the locked payment is released to the worker and the job is RELEASED.
        Otherwise the job stays SUBMITTED (client may dispute or worker may
        resubmit by raising/resolving accordingly).
        Returns the JSON verdict.
        Emits: [Evaluated], [PaymentReleased] (on acceptance)
        """
        jid = str(job_id).strip()
        if jid not in self.jobs:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Job {jid} not found")
        job = self.jobs[jid]
        caller = self._addr(gl.message.sender_account)

        if caller != job.client:
            raise gl.vm.UserError(
                f"{ERROR_EXPECTED} Only the client can trigger evaluation"
            )
        if job.status != "SUBMITTED":
            raise gl.vm.UserError(
                f"{ERROR_EXPECTED} Job must be SUBMITTED (status: {job.status})"
            )

        url = job.deliverable_url
        criteria = job.criteria
        description = job.description

        def verify() -> dict:
            text = self._fetch_deliverable(url)
            prompt = f"""You are a strict freelance-job deliverable verifier.

Job description:
{description}

Acceptance criteria (must ALL be met):
{criteria}

Deliverable content fetched from {url} (first 6000 chars):
{text[:6000]}

Determine whether the deliverable satisfies every acceptance criterion.
Respond ONLY with valid JSON (no markdown):
{{
  "criteria_met": true/false,
  "score": 0-100,
  "reason": "one-sentence justification"
}}"""
            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            if not isinstance(raw, dict):
                raise gl.vm.UserError(f"{ERROR_LLM} Expected dict from LLM")
            return {
                "criteria_met": bool(raw.get("criteria_met", False)),
                "score": int(raw.get("score", 0) or 0),
                "reason": str(raw.get("reason", ""))[:400],
            }

        def validator(leaders_res: gl.vm.Result) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                leader_msg = getattr(leaders_res, "message", "")
                try:
                    verify()
                    return False
                except gl.vm.UserError as e:
                    vmsg = getattr(e, "message", str(e))
                    if vmsg.startswith(ERROR_TRANSIENT) and leader_msg.startswith(ERROR_TRANSIENT):
                        return True
                    return vmsg == leader_msg
                except Exception:
                    return False
            try:
                val = verify()
            except Exception:
                return False
            return leaders_res.calldata.get("criteria_met") == val.get("criteria_met")

        result = gl.vm.run_nondet_unsafe(verify, validator)

        job = self.jobs[jid]
        job.ai_verdict = json.dumps(result)

        if result["criteria_met"]:
            payout = int(job.payment)
            self._credit(job.worker, payout)
            job.status = "RELEASED"
            self.jobs[jid] = job

            r = self._rep(job.worker)
            r.jobs_completed = u256(int(r.jobs_completed) + 1)
            r.total_earned = u256(int(r.total_earned) + payout)
            self._save_rep(r)

            print(f"[PaymentReleased] id={jid} amount={payout} to={job.worker}")
            print(f"[Evaluated] id={jid} accepted=true score={result['score']}")
        else:
            self.jobs[jid] = job
            print(f"[Evaluated] id={jid} accepted=false score={result['score']}")

        return json.dumps({"job_id": jid, **result})

    @gl.public.write
    def raise_dispute(self, job_id: str, reason: str) -> None:
        """Either party flags the job as DISPUTED. Admin resolves it.
        Emits: [DisputeRaised]"""
        jid = str(job_id).strip()
        if jid not in self.jobs:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Job {jid} not found")
        job = self.jobs[jid]
        caller = self._addr(gl.message.sender_account)

        if caller != job.client and caller != job.worker:
            raise gl.vm.UserError(
                f"{ERROR_EXPECTED} Only client or worker can dispute"
            )
        if job.status not in ("SUBMITTED", "ACCEPTED"):
            raise gl.vm.UserError(
                f"{ERROR_EXPECTED} Can only dispute ACCEPTED or SUBMITTED jobs "
                f"(status: {job.status})"
            )
        why = str(reason).strip()
        if not why:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} reason cannot be empty")

        # Enforce dispute window once a submission exists
        if int(job.submitted_at) > 0:
            now = int(gl.block.timestamp)
            if now > int(job.submitted_at) + DISPUTE_WINDOW:
                raise gl.vm.UserError(f"{ERROR_EXPECTED} Dispute window has closed")

        job.status = "DISPUTED"
        job.dispute_reason = why[:500]
        self.jobs[jid] = job
        print(f"[DisputeRaised] id={jid} by={caller}")

    @gl.public.write
    def resolve_dispute(self, job_id: str) -> str:
        """
        Admin (contract deployer) resolves a DISPUTED job using an AI verdict
        on the deliverable. If the AI judges the work acceptable, the worker
        is paid and wins reputation; otherwise the client is refunded and the
        worker loses reputation.
        Returns the JSON verdict.
        Emits: [DisputeResolved], [PaymentReleased] or [Refunded]
        """
        self._require_admin()
        jid = str(job_id).strip()
        if jid not in self.jobs:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Job {jid} not found")
        job = self.jobs[jid]
        if job.status != "DISPUTED":
            raise gl.vm.UserError(
                f"{ERROR_EXPECTED} Job not DISPUTED (status: {job.status})"
            )

        url = job.deliverable_url
        criteria = job.criteria
        reason = job.dispute_reason

        def verify() -> dict:
            text = self._fetch_deliverable(url) if url else "(no deliverable submitted)"
            prompt = f"""You are an impartial arbitrator for a freelance dispute.

Acceptance criteria:
{criteria}

Dispute reason from the disputing party:
{reason}

Deliverable content (first 6000 chars):
{text[:6000]}

Decide whether the worker fulfilled the criteria despite the dispute.
Respond ONLY with valid JSON (no markdown):
{{
  "worker_wins": true/false,
  "reason": "one-sentence justification"
}}"""
            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            if not isinstance(raw, dict):
                raise gl.vm.UserError(f"{ERROR_LLM} Expected dict from LLM")
            return {
                "worker_wins": bool(raw.get("worker_wins", False)),
                "reason": str(raw.get("reason", ""))[:400],
            }

        def validator(leaders_res: gl.vm.Result) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                return False
            try:
                val = verify()
            except Exception:
                return False
            return leaders_res.calldata.get("worker_wins") == val.get("worker_wins")

        result = gl.vm.run_nondet_unsafe(verify, validator)

        job = self.jobs[jid]
        job.ai_verdict = json.dumps(result)
        payment = int(job.payment)

        if result["worker_wins"] and job.worker:
            self._credit(job.worker, payment)
            rw = self._rep(job.worker)
            rw.jobs_completed = u256(int(rw.jobs_completed) + 1)
            rw.disputes_won = u256(int(rw.disputes_won) + 1)
            rw.total_earned = u256(int(rw.total_earned) + payment)
            self._save_rep(rw)
            rc = self._rep(job.client)
            rc.disputes_lost = u256(int(rc.disputes_lost) + 1)
            self._save_rep(rc)
            print(f"[PaymentReleased] id={jid} amount={payment} to={job.worker}")
        else:
            self._credit(job.client, payment)
            if job.worker:
                rw = self._rep(job.worker)
                rw.disputes_lost = u256(int(rw.disputes_lost) + 1)
                self._save_rep(rw)
            rc = self._rep(job.client)
            rc.disputes_won = u256(int(rc.disputes_won) + 1)
            self._save_rep(rc)
            print(f"[Refunded] id={jid} amount={payment} to={job.client}")

        job.status = "RESOLVED"
        self.jobs[jid] = job
        print(f"[DisputeResolved] id={jid} worker_wins={result['worker_wins']}")
        return json.dumps({"job_id": jid, **result})

    @gl.public.write
    def cancel_job(self, job_id: str) -> None:
        """Client cancels an OPEN job and gets the locked payment back.
        Emits: [JobCancelled]"""
        jid = str(job_id).strip()
        if jid not in self.jobs:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Job {jid} not found")
        job = self.jobs[jid]
        caller = self._addr(gl.message.sender_account)
        if caller != job.client:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Only the client can cancel")
        if job.status != "OPEN":
            raise gl.vm.UserError(
                f"{ERROR_EXPECTED} Only OPEN jobs can be cancelled "
                f"(status: {job.status})"
            )
        self._credit(job.client, int(job.payment))
        job.status = "CANCELLED"
        self.jobs[jid] = job
        print(f"[JobCancelled] id={jid}")

    # ── View methods ────────────────────────────────────────────────────────

    def _job_dict(self, j: Job) -> dict:
        return {
            "job_id": j.job_id,
            "client": j.client,
            "worker": j.worker,
            "title": j.title,
            "description": j.description,
            "criteria": j.criteria,
            "payment": int(j.payment),
            "deliverable_url": j.deliverable_url,
            "status": j.status,
            "created_at": int(j.created_at),
            "submitted_at": int(j.submitted_at),
            "dispute_reason": j.dispute_reason,
            "ai_verdict": j.ai_verdict,
        }

    @gl.public.view
    def get_job(self, job_id: str) -> str:
        jid = str(job_id).strip()
        if jid not in self.jobs:
            return json.dumps({})
        return json.dumps(self._job_dict(self.jobs[jid]))

    @gl.public.view
    def get_all_jobs(self) -> str:
        out = []
        for i in range(len(self.job_order)):
            jid = self.job_order[i]
            if jid in self.jobs:
                out.append(self._job_dict(self.jobs[jid]))
        return json.dumps(out)

    @gl.public.view
    def get_job_count(self) -> int:
        return int(self.counter)

    @gl.public.view
    def get_balance(self, wallet: str) -> int:
        return self._balance_of(self._addr(wallet))

    @gl.public.view
    def get_reputation(self, wallet: str) -> str:
        w = self._addr(wallet)
        r = self._rep(w)
        return json.dumps({
            "address": w,
            "jobs_completed": int(r.jobs_completed),
            "jobs_posted": int(r.jobs_posted),
            "disputes_won": int(r.disputes_won),
            "disputes_lost": int(r.disputes_lost),
            "total_earned": int(r.total_earned),
        })
