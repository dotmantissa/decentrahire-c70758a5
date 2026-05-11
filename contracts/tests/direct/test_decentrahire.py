"""Direct-mode tests for contracts/decentrahire.py (DecentraHire)."""

import json
import pytest

ADMIN  = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
CLIENT = "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"
WORKER = "0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC"
OTHER  = "0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD"

DELIVERABLE_URL = "https://files.example.com/work.zip"
CRITERIA = "Deliver a working Python script with tests"
PAY = 1_000


def _deploy(direct_deploy, direct_vm):
    # ADMIN is the deployer
    direct_vm.sender = ADMIN
    return direct_deploy("decentrahire.py")


def _fund(contract, direct_vm, who, amount=PAY * 4):
    direct_vm.sender = who
    contract.deposit_funds(amount)


def _post(contract, direct_vm, client=CLIENT, pay=PAY):
    direct_vm.sender = client
    return contract.post_job("Job", "Description goes here", CRITERIA, pay)


def _mock_eval(direct_vm, accepted=True, score=90, reason="Looks good"):
    direct_vm.mock_web(r"files\.example\.com", {"status": 200, "body": "deliverable body"})
    direct_vm.mock_llm(
        r"strict freelance-job deliverable verifier",
        {"criteria_met": accepted, "score": score, "reason": reason},
    )


def _mock_dispute(direct_vm, worker_wins=True, reason="Work matches criteria"):
    direct_vm.mock_web(r"files\.example\.com", {"status": 200, "body": "deliverable body"})
    direct_vm.mock_llm(
        r"impartial arbitrator",
        {"worker_wins": worker_wins, "reason": reason},
    )


# ── Funds ────────────────────────────────────────────────────────────────────

class TestFunds:
    def test_deposit_credits_balance(self, direct_vm, direct_deploy):
        c = _deploy(direct_deploy, direct_vm)
        _fund(c, direct_vm, CLIENT, 500)
        assert c.get_balance(CLIENT) == 500

    def test_deposit_rejects_zero(self, direct_vm, direct_deploy):
        c = _deploy(direct_deploy, direct_vm)
        direct_vm.sender = CLIENT
        with direct_vm.expect_revert("amount must be positive"):
            c.deposit_funds(0)

    def test_withdraw_debits_balance(self, direct_vm, direct_deploy):
        c = _deploy(direct_deploy, direct_vm)
        _fund(c, direct_vm, CLIENT, 500)
        direct_vm.sender = CLIENT
        c.withdraw_funds(200)
        assert c.get_balance(CLIENT) == 300

    def test_withdraw_insufficient(self, direct_vm, direct_deploy):
        c = _deploy(direct_deploy, direct_vm)
        direct_vm.sender = CLIENT
        with direct_vm.expect_revert("Insufficient balance"):
            c.withdraw_funds(50)


# ── post_job ─────────────────────────────────────────────────────────────────

class TestPostJob:
    def test_post_locks_payment_and_stores_job(self, direct_vm, direct_deploy):
        c = _deploy(direct_deploy, direct_vm)
        _fund(c, direct_vm, CLIENT)
        jid = _post(c, direct_vm)
        assert jid == "job-1"
        assert c.get_balance(CLIENT) == PAY * 3  # one PAY locked
        j = json.loads(c.get_job(jid))
        assert j["status"] == "OPEN"
        assert j["payment"] == PAY
        assert j["client"] == CLIENT.lower()

    def test_post_requires_balance(self, direct_vm, direct_deploy):
        c = _deploy(direct_deploy, direct_vm)
        direct_vm.sender = CLIENT
        with direct_vm.expect_revert("Insufficient balance"):
            c.post_job("t", "d", "c", PAY)

    def test_post_validates_fields(self, direct_vm, direct_deploy):
        c = _deploy(direct_deploy, direct_vm)
        _fund(c, direct_vm, CLIENT)
        direct_vm.sender = CLIENT
        with direct_vm.expect_revert("title cannot be empty"):
            c.post_job("", "d", "c", PAY)
        with direct_vm.expect_revert("description cannot be empty"):
            c.post_job("t", "", "c", PAY)
        with direct_vm.expect_revert("criteria cannot be empty"):
            c.post_job("t", "d", "", PAY)
        with direct_vm.expect_revert("payment must be positive"):
            c.post_job("t", "d", "c", 0)

    def test_post_increments_reputation_jobs_posted(self, direct_vm, direct_deploy):
        c = _deploy(direct_deploy, direct_vm)
        _fund(c, direct_vm, CLIENT)
        _post(c, direct_vm)
        rep = json.loads(c.get_reputation(CLIENT))
        assert rep["jobs_posted"] == 1

    def test_get_job_count_and_all_jobs(self, direct_vm, direct_deploy):
        c = _deploy(direct_deploy, direct_vm)
        _fund(c, direct_vm, CLIENT, PAY * 5)
        _post(c, direct_vm)
        _post(c, direct_vm)
        assert c.get_job_count() == 2
        assert len(json.loads(c.get_all_jobs())) == 2


# ── accept_job ───────────────────────────────────────────────────────────────

class TestAcceptJob:
    def test_worker_accepts(self, direct_vm, direct_deploy):
        c = _deploy(direct_deploy, direct_vm)
        _fund(c, direct_vm, CLIENT)
        jid = _post(c, direct_vm)
        direct_vm.sender = WORKER
        c.accept_job(jid)
        j = json.loads(c.get_job(jid))
        assert j["worker"] == WORKER.lower()
        assert j["status"] == "ACCEPTED"

    def test_client_cannot_accept_own(self, direct_vm, direct_deploy):
        c = _deploy(direct_deploy, direct_vm)
        _fund(c, direct_vm, CLIENT)
        jid = _post(c, direct_vm)
        direct_vm.sender = CLIENT
        with direct_vm.expect_revert("cannot accept their own"):
            c.accept_job(jid)

    def test_double_accept_rejected(self, direct_vm, direct_deploy):
        c = _deploy(direct_deploy, direct_vm)
        _fund(c, direct_vm, CLIENT)
        jid = _post(c, direct_vm)
        direct_vm.sender = WORKER
        c.accept_job(jid)
        direct_vm.sender = OTHER
        with direct_vm.expect_revert("Job not OPEN"):
            c.accept_job(jid)


# ── submit / evaluate ────────────────────────────────────────────────────────

class TestSubmitAndEvaluate:
    def _setup(self, direct_vm, direct_deploy):
        c = _deploy(direct_deploy, direct_vm)
        _fund(c, direct_vm, CLIENT)
        jid = _post(c, direct_vm)
        direct_vm.sender = WORKER
        c.accept_job(jid)
        return c, jid

    def test_submit_requires_worker(self, direct_vm, direct_deploy):
        c, jid = self._setup(direct_vm, direct_deploy)
        direct_vm.sender = OTHER
        with direct_vm.expect_revert("Only the assigned worker"):
            c.submit_deliverable(jid, DELIVERABLE_URL)

    def test_submit_sets_status(self, direct_vm, direct_deploy):
        c, jid = self._setup(direct_vm, direct_deploy)
        direct_vm.sender = WORKER
        c.submit_deliverable(jid, DELIVERABLE_URL)
        j = json.loads(c.get_job(jid))
        assert j["status"] == "SUBMITTED"
        assert j["deliverable_url"] == DELIVERABLE_URL

    def test_evaluate_accepts_pays_worker(self, direct_vm, direct_deploy):
        c, jid = self._setup(direct_vm, direct_deploy)
        direct_vm.sender = WORKER
        c.submit_deliverable(jid, DELIVERABLE_URL)
        _mock_eval(direct_vm, accepted=True)
        direct_vm.sender = CLIENT
        verdict = json.loads(c.evaluate_deliverable(jid))
        assert verdict["criteria_met"] is True
        j = json.loads(c.get_job(jid))
        assert j["status"] == "RELEASED"
        assert c.get_balance(WORKER) == PAY
        rep = json.loads(c.get_reputation(WORKER))
        assert rep["jobs_completed"] == 1
        assert rep["total_earned"] == PAY

    def test_evaluate_rejects_holds_funds(self, direct_vm, direct_deploy):
        c, jid = self._setup(direct_vm, direct_deploy)
        direct_vm.sender = WORKER
        c.submit_deliverable(jid, DELIVERABLE_URL)
        _mock_eval(direct_vm, accepted=False, score=20, reason="incomplete")
        direct_vm.sender = CLIENT
        verdict = json.loads(c.evaluate_deliverable(jid))
        assert verdict["criteria_met"] is False
        assert c.get_balance(WORKER) == 0
        j = json.loads(c.get_job(jid))
        assert j["status"] == "SUBMITTED"

    def test_evaluate_only_by_client(self, direct_vm, direct_deploy):
        c, jid = self._setup(direct_vm, direct_deploy)
        direct_vm.sender = WORKER
        c.submit_deliverable(jid, DELIVERABLE_URL)
        _mock_eval(direct_vm)
        direct_vm.sender = OTHER
        with direct_vm.expect_revert("Only the client"):
            c.evaluate_deliverable(jid)


# ── Disputes ─────────────────────────────────────────────────────────────────

class TestDisputes:
    def _submitted(self, direct_vm, direct_deploy):
        c = _deploy(direct_deploy, direct_vm)
        _fund(c, direct_vm, CLIENT)
        jid = _post(c, direct_vm)
        direct_vm.sender = WORKER
        c.accept_job(jid)
        c.submit_deliverable(jid, DELIVERABLE_URL)
        return c, jid

    def test_client_can_dispute(self, direct_vm, direct_deploy):
        c, jid = self._submitted(direct_vm, direct_deploy)
        direct_vm.sender = CLIENT
        c.raise_dispute(jid, "Quality unacceptable")
        j = json.loads(c.get_job(jid))
        assert j["status"] == "DISPUTED"
        assert j["dispute_reason"] == "Quality unacceptable"

    def test_outsider_cannot_dispute(self, direct_vm, direct_deploy):
        c, jid = self._submitted(direct_vm, direct_deploy)
        direct_vm.sender = OTHER
        with direct_vm.expect_revert("Only client or worker"):
            c.raise_dispute(jid, "x")

    def test_admin_resolves_for_worker(self, direct_vm, direct_deploy):
        c, jid = self._submitted(direct_vm, direct_deploy)
        direct_vm.sender = CLIENT
        c.raise_dispute(jid, "Quality unacceptable")
        _mock_dispute(direct_vm, worker_wins=True)
        direct_vm.sender = ADMIN
        c.resolve_dispute(jid)
        j = json.loads(c.get_job(jid))
        assert j["status"] == "RESOLVED"
        assert c.get_balance(WORKER) == PAY
        rep = json.loads(c.get_reputation(WORKER))
        assert rep["disputes_won"] == 1

    def test_admin_resolves_for_client(self, direct_vm, direct_deploy):
        c, jid = self._submitted(direct_vm, direct_deploy)
        direct_vm.sender = CLIENT
        c.raise_dispute(jid, "fraud")
        _mock_dispute(direct_vm, worker_wins=False, reason="Off-spec")
        direct_vm.sender = ADMIN
        c.resolve_dispute(jid)
        assert c.get_balance(CLIENT) == PAY * 3 + PAY  # initial - locked + refund
        rep = json.loads(c.get_reputation(WORKER))
        assert rep["disputes_lost"] == 1

    def test_non_admin_cannot_resolve(self, direct_vm, direct_deploy):
        c, jid = self._submitted(direct_vm, direct_deploy)
        direct_vm.sender = CLIENT
        c.raise_dispute(jid, "x")
        _mock_dispute(direct_vm)
        direct_vm.sender = WORKER
        with direct_vm.expect_revert("Only admin"):
            c.resolve_dispute(jid)


# ── cancel_job ───────────────────────────────────────────────────────────────

class TestCancel:
    def test_client_cancels_open_refunded(self, direct_vm, direct_deploy):
        c = _deploy(direct_deploy, direct_vm)
        _fund(c, direct_vm, CLIENT)
        jid = _post(c, direct_vm)
        direct_vm.sender = CLIENT
        c.cancel_job(jid)
        j = json.loads(c.get_job(jid))
        assert j["status"] == "CANCELLED"
        assert c.get_balance(CLIENT) == PAY * 4  # fully refunded

    def test_cannot_cancel_after_accept(self, direct_vm, direct_deploy):
        c = _deploy(direct_deploy, direct_vm)
        _fund(c, direct_vm, CLIENT)
        jid = _post(c, direct_vm)
        direct_vm.sender = WORKER
        c.accept_job(jid)
        direct_vm.sender = CLIENT
        with direct_vm.expect_revert("Only OPEN jobs"):
            c.cancel_job(jid)

    def test_non_client_cannot_cancel(self, direct_vm, direct_deploy):
        c = _deploy(direct_deploy, direct_vm)
        _fund(c, direct_vm, CLIENT)
        jid = _post(c, direct_vm)
        direct_vm.sender = OTHER
        with direct_vm.expect_revert("Only the client can cancel"):
            c.cancel_job(jid)


# ── Views ────────────────────────────────────────────────────────────────────

class TestViews:
    def test_get_job_unknown_returns_empty(self, direct_vm, direct_deploy):
        c = _deploy(direct_deploy, direct_vm)
        assert json.loads(c.get_job("nope")) == {}

    def test_default_reputation(self, direct_vm, direct_deploy):
        c = _deploy(direct_deploy, direct_vm)
        rep = json.loads(c.get_reputation(WORKER))
        assert rep["jobs_completed"] == 0
        assert rep["address"] == WORKER.lower()
