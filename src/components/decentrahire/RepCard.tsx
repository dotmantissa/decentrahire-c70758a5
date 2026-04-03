import { useReputation } from "@/hooks/useQueries";
import { repScore, repTier } from "@/lib/types";
import { Skeleton } from "./Skeleton";

export function RepCard({ address, compact }: { address: string; compact?: boolean }) {
  const { data: rep, isLoading } = useReputation(address);

  if (isLoading) return <Skeleton w={120} h={24} />;
  if (!rep) return null;

  const score = repScore(rep);
  const tier = repTier(score);

  if (compact) return (
    <span className="badge" style={{ background: tier.bg, color: tier.color, border: `1px solid ${tier.color}33` }}>
      {tier.label}
      <span style={{ opacity: 0.7, marginLeft: 4 }}>{score} pts</span>
    </span>
  );

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span className="label-caps">Reputation</span>
        <span className="badge" style={{ background: tier.bg, color: tier.color, border: `1px solid ${tier.color}33` }}>
          ✦ {tier.label} · {score} pts
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
        {([
          ["Jobs Done", rep.jobs_completed, "var(--green)"],
          ["Jobs Posted", rep.jobs_posted, "var(--amber-3)"],
          ["Earned", `${rep.total_earned} GL`, "var(--terra-2)"],
        ] as [string, string | number, string][]).map(([l, v, c]) => (
          <div key={l} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: c }}>{v}</div>
            <div className="label-caps" style={{ marginTop: 4 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {([
          ["Disputes Won", rep.disputes_won, "var(--green)"],
          ["Disputes Lost", rep.disputes_lost, "var(--red)"],
        ] as [string, number, string][]).map(([l, v, c]) => (
          <div key={l} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: c }}>{v}</div>
            <div className="label-caps" style={{ marginTop: 4 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
