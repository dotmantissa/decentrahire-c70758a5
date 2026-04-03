const STEPS = [
  { n: "01", icon: "🔒", title: "Post & Escrow", desc: "Clients describe the work, write evaluation criteria, and lock payment in the smart contract. Funds are safe until delivery is verified.", color: "var(--amber-4)" },
  { n: "02", icon: "🤝", title: "Accept & Build", desc: "Any connected wallet can browse open jobs and accept one. It's exclusively theirs once accepted — no bidding, no race conditions.", color: "var(--terra-3)" },
  { n: "03", icon: "📦", title: "Submit a URL", desc: "Freelancers deliver by posting a public URL — a GitHub repo, live site, Google Doc, or any verifiable link on the open web.", color: "var(--amber-3)" },
  { n: "04", icon: "🤖", title: "AI Evaluates On-Chain", desc: "The contract fetches the URL and evaluates it against the criteria. Multiple validators run this independently, each with their own LLM. Consensus decides.", color: "var(--green)" },
  { n: "05", icon: "⚖", title: "Dispute & Arbitrate", desc: "If rejected, clients may file a formal dispute. A second, deeper AI arbitration weighs all evidence — criteria, deliverable, objection — and issues a binding verdict.", color: "var(--terra-2)" },
  { n: "06", icon: "🏆", title: "Reputation On-Chain", desc: "Every job, dispute won, and dispute lost is permanently recorded per wallet address. A verifiable track record no platform can revoke.", color: "var(--amber-4)" },
];

export function HowItWorks() {
  return (
    <section className="section container">
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <span className="label-caps amber">The Protocol</span>
        <h2 className="display-xl" style={{ marginTop: 8 }}>How DecentraHire Works</h2>
        <p className="body-lg" style={{ color: "var(--text-secondary)", maxWidth: 600, margin: "16px auto 0" }}>
          No middlemen. No biased arbitrators. No platform fees. Just smart contracts and AI consensus running on GenLayer.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
        {STEPS.map((s, i) => (
          <div key={i} className={`card anim-fade-up delay-${i + 1}`} style={{ padding: 28 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>{s.icon}</div>
            <div className="label-caps" style={{ color: s.color, marginBottom: 8 }}>Step {s.n}</div>
            <h3 className="display-sm" style={{ marginBottom: 8 }}>{s.title}</h3>
            <p className="body-sm" style={{ color: "var(--text-secondary)" }}>{s.desc}</p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 48, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
        {[
          { icon: "⛓", title: "Non-Custodial", desc: "Funds are held in the contract. No admin key exists. Not even the developers can move your money." },
          { icon: "🌐", title: "Multi-Validator AI", desc: "Evaluation runs across multiple independent validators, each with its own LLM. No single AI controls the outcome." },
          { icon: "♾", title: "Permanent Reputation", desc: "On-chain reputation follows your wallet address forever. No platform can deplatform your track record." },
        ].map(t => (
          <div key={t.title} className="card anim-fade-up" style={{ padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{t.icon}</div>
            <div className="display-sm" style={{ marginBottom: 6 }}>{t.title}</div>
            <p className="body-sm" style={{ color: "var(--text-secondary)" }}>{t.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
