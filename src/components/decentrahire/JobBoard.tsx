import { useState } from "react";
import { useAllJobs } from "@/hooks/useQueries";
import { useWallet } from "@/lib/wallet-context";
import { JobCard } from "./JobCard";
import { JobModal } from "./JobModal";
import { PostJobModal } from "./PostJobModal";
import { Skeleton } from "./Skeleton";
import type { JobStatus } from "@/lib/types";

type Filter = JobStatus | "ALL" | "RESOLVED";

const FILTERS: { label: string; value: Filter }[] = [
  { label: "All", value: "ALL" },
  { label: "Open", value: "OPEN" },
  { label: "In Progress", value: "ACTIVE" },
  { label: "Review", value: "PENDING_REVIEW" },
  { label: "Approved", value: "APPROVED" },
  { label: "Disputed", value: "DISPUTED" },
  { label: "Resolved", value: "RESOLVED" },
];

export function JobBoard() {
  const { data: jobs, isLoading } = useAllJobs();
  const { address, connected } = useWallet();

  const [filter, setFilter] = useState<Filter>("ALL");
  const [search, setSearch] = useState("");
  const [myOnly, setMyOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [postOpen, setPostOpen] = useState(false);

  const all = jobs ?? [];
  const filtered = all.filter(job => {
    if (filter === "RESOLVED") {
      if (!["RESOLVED_FREELANCER", "RESOLVED_CLIENT"].includes(job.status)) return false;
    } else if (filter !== "ALL") {
      if (job.status !== filter) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      if (!job.title.toLowerCase().includes(q) && !job.description.toLowerCase().includes(q)) return false;
    }
    if (myOnly && address) {
      if (job.client !== address && job.freelancer !== address) return false;
    }
    return true;
  });

  return (
    <section className="section container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 className="display-lg">Job Board</h2>
          <p className="body-sm" style={{ color: "var(--text-muted)" }}>{all.length} jobs · {all.filter(j => j.status === "OPEN").length} open</p>
        </div>
        {connected && (
          <button className="btn btn-gold" onClick={() => setPostOpen(true)}>+ Post a Job</button>
        )}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24, alignItems: "center" }}>
        <input className="input" placeholder="Search jobs…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 240, flexGrow: 1 }} />
        <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          {FILTERS.map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)} style={{
              padding: "5px 12px", borderRadius: 7, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: filter === f.value ? "var(--bg-4)" : "transparent",
              color: filter === f.value ? "var(--text-primary)" : "var(--text-muted)",
              transition: "all 0.12s",
            }}>{f.label}</button>
          ))}
        </div>
        {connected && (
          <button onClick={() => setMyOnly(p => !p)} style={{
            padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer",
            background: myOnly ? "rgba(245,158,11,0.1)" : "transparent",
            border: myOnly ? "1px solid var(--amber-5)" : "1px solid var(--border)",
            color: myOnly ? "var(--amber-4)" : "var(--text-muted)",
          }}>My Jobs</button>
        )}
      </div>

      {isLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} h={180} r={14} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{all.length === 0 ? "📋" : "🔍"}</div>
          <div className="display-sm" style={{ marginBottom: 8 }}>{all.length === 0 ? "No jobs posted yet" : "No jobs match"}</div>
          <p className="body-sm" style={{ color: "var(--text-muted)" }}>
            {all.length === 0 && connected ? "Be the first — post a job above." : "Try a different filter or search term."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
          {filtered.map(job => (
            <JobCard key={job.job_id} job={job} currentAddr={address} onClick={() => setSelectedId(job.job_id)} />
          ))}
        </div>
      )}

      {selectedId && <JobModal jobId={selectedId} onClose={() => setSelectedId(null)} />}
      {postOpen && <PostJobModal onClose={() => setPostOpen(false)} />}
    </section>
  );
}
