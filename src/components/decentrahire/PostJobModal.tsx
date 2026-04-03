import { useState } from "react";
import { useContract } from "@/hooks/useContract";
import { useBalance } from "@/hooks/useQueries";
import { useWallet } from "@/lib/wallet-context";
import { TxBanner } from "./TxBanner";

export function PostJobModal({ onClose }: { onClose: () => void }) {
  const { address } = useWallet();
  const { data: balance } = useBalance(address);
  const { postJob, tx, reset } = useContract();

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [criteria, setCriteria] = useState("");
  const [payment, setPayment] = useState("");

  const payNum = Number(payment);
  const noFunds = payNum > 0 && payNum > (balance ?? 0);
  const valid = title.trim() && desc.trim() && criteria.trim() && payNum > 0 && !noFunds;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 className="display-md">Post a Job</h2>
            <button onClick={onClose} className="btn btn-ghost btn-sm">×</button>
          </div>
          <p className="body-sm" style={{ color: "var(--text-secondary)", marginTop: 8 }}>
            Payment locks in escrow immediately. The AI evaluates delivery against your criteria.
          </p>
        </div>

        <div className="modal-body">
          <TxBanner tx={tx} onDismiss={reset} />

          <div style={{ marginTop: 16 }}>
            <label className="field-label">Job Title</label>
            <input className="input" placeholder="e.g. Build a landing page" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div style={{ marginTop: 16 }}>
            <label className="field-label">Description</label>
            <textarea className="input" placeholder="Describe the work in detail…" value={desc} onChange={e => setDesc(e.target.value)} rows={3} />
          </div>

          <div style={{ marginTop: 16 }}>
            <label className="field-label">Evaluation Criteria</label>
            <textarea className="input input-criteria" placeholder="Be specific — the AI evaluates against these exact criteria…" value={criteria} onChange={e => setCriteria(e.target.value)} rows={4} />
            <div className="field-hint">✦ These criteria are what the AI uses to judge the deliverable. Be precise.</div>
          </div>

          <div style={{ marginTop: 16 }}>
            <label className="field-label">Payment (GL Tokens)</label>
            <input className="input" type="number" placeholder="100" value={payment} onChange={e => setPayment(e.target.value)} />
            {noFunds && <div className="body-sm danger" style={{ marginTop: 6 }}>Insufficient balance ({balance ?? 0} GL available)</div>}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-gold"
            disabled={!valid || tx.loading}
            onClick={() => { reset(); postJob(title, desc, criteria, payNum, onClose); }}
          >
            {tx.loading ? "Posting…" : `Post Job · ${payNum || 0} GL`}
          </button>
        </div>
      </div>
    </div>
  );
}
