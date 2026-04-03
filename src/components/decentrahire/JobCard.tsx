import { STATUS_LABEL, STATUS_CLASS, truncAddr } from "@/lib/types";
import type { Job } from "@/lib/types";

export function JobCard({ job, currentAddr, onClick }: { job: Job; currentAddr: string | null; onClick: () => void }) {
  const mine = currentAddr === job.client || currentAddr === job.freelancer;
  const isOpen = job.status === "OPEN";

  return (
    <div className="card card-hover anim-fade-up" style={{ padding: 24, cursor: "pointer" }} onClick={onClick}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span className={`badge ${STATUS_CLASS[job.status]}`}>{STATUS_LABEL[job.status]}</span>
          {mine && <span className="badge" style={{ background: "rgba(245,158,11,0.1)", color: "var(--amber-4)", border: "1px solid rgba(245,158,11,0.2)" }}>YOURS</span>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--amber-3)" }}>{job.payment_amount}</div>
          <div className="label-caps">$GEN</div>
        </div>
      </div>
      <h3 className="display-sm" style={{ marginBottom: 8 }}>{job.title}</h3>
      <p className="body-sm" style={{ color: "var(--text-secondary)", marginBottom: 16, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {job.description}
      </p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="body-sm" style={{ color: "var(--text-muted)" }}>
          <span>Client {truncAddr(job.client)}</span>
          {job.freelancer && <span style={{ marginLeft: 12 }}>Freelancer {truncAddr(job.freelancer)}</span>}
        </div>
        <span style={{ fontSize: 13, color: "var(--amber-4)", fontWeight: 600 }}>
          {isOpen ? "Apply →" : "View details →"}
        </span>
      </div>
    </div>
  );
}
