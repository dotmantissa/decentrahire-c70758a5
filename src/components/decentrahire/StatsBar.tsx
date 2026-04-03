import { useAllJobs } from "@/hooks/useQueries";
import { Skeleton } from "./Skeleton";

export function StatsBar() {
  const { data: jobs, isLoading } = useAllJobs();
  if (isLoading) return (
    <div className="section-sm" style={{ display: "flex", gap: 16, justifyContent: "center" }}>
      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} w={100} h={60} r={12} />)}
    </div>
  );

  const j = jobs ?? [];
  const stats = [
    { label: "Total Jobs", value: j.length, color: "var(--cream-2)" },
    { label: "Open", value: j.filter(x => x.status === "OPEN").length, color: "var(--green)" },
    { label: "In Progress", value: j.filter(x => ["ACTIVE", "PENDING_REVIEW"].includes(x.status)).length, color: "var(--blue)" },
    { label: "Completed", value: j.filter(x => ["APPROVED", "RESOLVED_FREELANCER", "RESOLVED_CLIENT"].includes(x.status)).length, color: "var(--amber-3)" },
    { label: "Value Locked", value: j.filter(x => ["OPEN", "ACTIVE", "PENDING_REVIEW", "DISPUTED"].includes(x.status)).reduce((s, x) => s + x.payment_amount, 0) + " GL", color: "var(--terra-2)" },
  ];

  return (
    <div className="section-sm container" style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
      {stats.map(({ label, value, color }) => (
        <div key={label} className="card anim-fade-up" style={{ padding: "16px 24px", textAlign: "center", minWidth: 100 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
          <div className="label-caps" style={{ marginTop: 4 }}>{label}</div>
        </div>
      ))}
    </div>
  );
}
