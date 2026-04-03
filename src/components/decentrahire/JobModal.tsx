import { useState } from "react";
import { useJob } from "@/hooks/useQueries";
import { useContract } from "@/hooks/useContract";
import { useWallet } from "@/lib/wallet-context";
import { TxBanner } from "./TxBanner";
import { Skeleton } from "./Skeleton";
import { STATUS_LABEL, STATUS_CLASS, truncAddr } from "@/lib/types";
import type { Job } from "@/lib/types";

export function JobModal({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const { address } = useWallet();
  const { data: job, isLoading } = useJob(jobId);
  const c = useContract();

  const [tab, setTab] = useState<"overview" | "criteria" | "ai" | "dispute">("overview");
  const [url, setUrl] = useState("");
  const [reason, setReason] = useState("");

  if (isLoading) return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-body"><Skeleton h={200} /></div>
      </div>
    </div>
  );

  if (!job) return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-body" style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
          <div>Job not found.</div>
        </div>
      </div>
    </div>
  );

  const isClient = address === job.client;
  const isFreelancer = address === job.freelancer;

  const availTabs = [
    { key: "overview" as const, label: "Overview" },
    { key: "criteria" as const, label: "✦ Criteria" },
    ...(job.ai_verdict ? [{ key: "ai" as const, label: "🤖 AI Verdict" }] : []),
    ...(job.dispute_verdict ? [{ key: "dispute" as const, label: "⚖ Arbitration" }] : []),
  ];

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span className={`badge ${STATUS_CLASS[job.status]}`}>{STATUS_LABEL[job.status]}</span>
              <span className="label-caps" style={{ marginLeft: 8 }}>Job #{job.job_id}</span>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: "var(--amber-3)" }}>{job.payment_amount}</span>
              <div className="label-caps">GL tokens</div>
            </div>
          </div>
          <h2 className="display-md" style={{ marginTop: 12 }}>{job.title}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ position: "absolute", top: 16, right: 16 }}>×</button>

          <div className="tabs" style={{ marginTop: 16 }}>
            {availTabs.map(t => (
              <button key={t.key} className={`tab ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>{t.label}</button>
            ))}
          </div>
        </div>

        <div className="modal-body">
          <TxBanner tx={c.tx} onDismiss={c.reset} />

          {tab === "overview" && (
            <div>
              <p className="body-lg" style={{ color: "var(--text-secondary)", marginBottom: 16 }}>{job.description}</p>
              {([["Client", job.client], ["Freelancer", job.freelancer || "Not yet assigned"]] as [string, string][]).map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                  <span className="label-caps">{l}</span>
                  <span className="mono">{v.startsWith("0x") ? truncAddr(v, 10) : v}</span>
                </div>
              ))}
              {job.deliverable_url && (
                <div style={{ marginTop: 16 }}>
                  <span className="label-caps">Deliverable</span>
                  <a href={job.deliverable_url} target="_blank" rel="noreferrer" style={{ display: "block", color: "var(--amber-4)", marginTop: 4, textDecoration: "underline" }}>
                    {job.deliverable_url} ↗
                  </a>
                </div>
              )}
            </div>
          )}

          {tab === "criteria" && (
            <div>
              <p className="body-sm" style={{ color: "var(--text-muted)", marginBottom: 12 }}>
                These are the exact requirements the AI evaluates the deliverable against. Every criterion must be satisfied for an APPROVED verdict.
              </p>
              <div className="card" style={{ padding: 16, whiteSpace: "pre-wrap", fontFamily: "var(--font-body)", fontSize: 14, lineHeight: 1.7, color: "var(--text-primary)" }}>
                {job.criteria}
              </div>
            </div>
          )}

          {tab === "ai" && job.ai_verdict && (
            <div>
              <div className={`badge ${job.ai_verdict === "APPROVED" ? "badge-approved" : "badge-rejected"}`} style={{ fontSize: 14, padding: "6px 16px", marginBottom: 16 }}>
                {job.ai_verdict === "APPROVED" ? "✦ Approved" : "✕ Rejected"}
              </div>
              <p className="body-lg" style={{ color: "var(--text-secondary)", marginBottom: 16 }}>{job.ai_reasoning}</p>
              {job.ai_criteria_met?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div className="label-caps success" style={{ marginBottom: 8 }}>Criteria Met</div>
                  {job.ai_criteria_met.map((c, i) => (
                    <div key={i} className="body-sm" style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                      <span style={{ color: "var(--green)" }}>✓</span>{c}
                    </div>
                  ))}
                </div>
              )}
              {job.ai_criteria_failed?.length > 0 && (
                <div>
                  <div className="label-caps danger" style={{ marginBottom: 8 }}>Criteria Failed</div>
                  {job.ai_criteria_failed.map((c, i) => (
                    <div key={i} className="body-sm" style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                      <span style={{ color: "var(--red)" }}>✕</span>{c}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "dispute" && job.dispute_verdict && (
            <div>
              <div className={`badge ${job.dispute_verdict === "FREELANCER_WINS" ? "badge-resolved-f" : "badge-resolved-c"}`} style={{ fontSize: 14, padding: "6px 16px", marginBottom: 16 }}>
                ⚖ {job.dispute_verdict === "FREELANCER_WINS" ? "Freelancer Wins" : "Client Wins"}
              </div>
              <p className="body-lg" style={{ color: "var(--text-secondary)", marginBottom: 16 }}>{job.dispute_reasoning}</p>
              {job.dispute_key_finding && (
                <div className="card" style={{ padding: 16, marginBottom: 12 }}>
                  <strong>Key finding: </strong>{job.dispute_key_finding}
                </div>
              )}
              {job.dispute_reason && (
                <div style={{ marginTop: 12 }}>
                  <div className="label-caps" style={{ marginBottom: 8 }}>Client's Objection</div>
                  <p className="body-sm" style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>"{job.dispute_reason}"</p>
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 24 }}>
            <ActionZone
              job={job} isClient={isClient} isFreelancer={isFreelancer} connected={!!address}
              url={url} setUrl={setUrl} reason={reason} setReason={setReason} loading={c.tx.loading}
              onAccept={() => { c.reset(); c.acceptJob(job.job_id); }}
              onSubmit={() => { c.reset(); c.submitDeliverable(job.job_id, url); }}
              onEvaluate={() => { c.reset(); c.evaluateDeliverable(job.job_id); }}
              onDispute={() => { c.reset(); c.raiseDispute(job.job_id, reason); }}
              onResolve={() => { c.reset(); c.resolveDispute(job.job_id); }}
              onCancel={() => { c.reset(); c.cancelJob(job.job_id, onClose); }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionZone({ job, isClient, isFreelancer, connected, url, setUrl, reason, setReason, loading,
  onAccept, onSubmit, onEvaluate, onDispute, onResolve, onCancel }: {
  job: Job; isClient: boolean; isFreelancer: boolean; connected: boolean;
  url: string; setUrl: (v: string) => void; reason: string; setReason: (v: string) => void;
  loading: boolean;
  onAccept: () => void; onSubmit: () => void; onEvaluate: () => void;
  onDispute: () => void; onResolve: () => void; onCancel: () => void;
}) {
  if (!connected) return (
    <div className="card" style={{ padding: 20, textAlign: "center", color: "var(--text-muted)" }}>
      Connect your wallet to interact with this job.
    </div>
  );

  switch (job.status) {
    case "OPEN": return (
      <div style={{ display: "flex", gap: 10 }}>
        {isClient && <button className="btn btn-danger" disabled={loading} onClick={onCancel}>Cancel & Refund</button>}
        {!isClient && <button className="btn btn-gold btn-lg" style={{ flex: 1 }} disabled={loading} onClick={onAccept}>{loading ? "Accepting…" : "🤝 Accept This Job"}</button>}
      </div>
    );

    case "ACTIVE": return isFreelancer ? (
      <div>
        <label className="field-label">Deliverable URL</label>
        <div className="field-hint" style={{ marginBottom: 8 }}>Submit any public URL — GitHub repo, live site, Google Doc, Notion page, etc. The AI will fetch and read it.</div>
        <input className="input" placeholder="https://…" value={url} onChange={e => setUrl(e.target.value)} />
        <button className="btn btn-gold" style={{ marginTop: 12, width: "100%" }} disabled={loading || !url.trim()} onClick={onSubmit}>{loading ? "Submitting…" : "Submit"}</button>
      </div>
    ) : (
      <div className="card" style={{ padding: 20, textAlign: "center", color: "var(--text-muted)" }}>
        Waiting for the freelancer to submit their work.
      </div>
    );

    case "PENDING_REVIEW": return (
      <div>
        <p className="body-sm" style={{ color: "var(--text-secondary)", marginBottom: 12 }}>
          Work has been submitted. Trigger AI evaluation — the contract will fetch the deliverable URL and evaluate it against the criteria across multiple independent validators.
        </p>
        <button className="btn btn-gold btn-lg" style={{ width: "100%" }} disabled={loading} onClick={onEvaluate}>
          {loading ? "Evaluating… (30–60s)" : "🤖 Run AI Evaluation"}
        </button>
      </div>
    );

    case "REJECTED": return isClient ? (
      <div>
        <p className="body-sm" style={{ color: "var(--text-secondary)", marginBottom: 12 }}>
          The AI rejected this delivery. If you believe the verdict is wrong, or want a deeper review, file a formal dispute.
        </p>
        <label className="field-label">Dispute Reason</label>
        <textarea className="input" placeholder="Explain what fell short…" value={reason} onChange={e => setReason(e.target.value)} rows={3} />
        <button className="btn btn-gold" style={{ marginTop: 12, width: "100%" }} disabled={loading || !reason.trim()} onClick={onDispute}>
          {loading ? "Filing…" : "⚖ File Dispute"}
        </button>
      </div>
    ) : (
      <div className="card" style={{ padding: 20, textAlign: "center", color: "var(--text-muted)" }}>
        Awaiting client decision on the rejection.
      </div>
    );

    case "DISPUTED": return (
      <div>
        <p className="body-sm" style={{ color: "var(--text-secondary)", marginBottom: 12 }}>
          A dispute has been filed. Trigger AI arbitration for a final binding verdict.
        </p>
        <button className="btn btn-gold btn-lg" style={{ width: "100%" }} disabled={loading} onClick={onResolve}>
          {loading ? "Arbitrating… (30–60s)" : "⚖ Run AI Arbitration"}
        </button>
      </div>
    );

    default: return null;
  }
}
