import { Header } from "@/components/decentrahire/Header";
import { StatsBar } from "@/components/decentrahire/StatsBar";
import { JobBoard } from "@/components/decentrahire/JobBoard";
import { HowItWorks } from "@/components/decentrahire/HowItWorks";

const Index = () => {
  return (
    <>
      <Header />
      <main>
        <section className="section container" style={{ textAlign: "center" }}>
          <span className="label-caps amber">Trustless Freelance on GenLayer</span>
          <h1 className="display-2xl" style={{ marginTop: 12 }}>
            Work judged by <span className="gold-text">AI consensus</span>, not humans
          </h1>
          <p className="body-lg" style={{ color: "var(--text-secondary)", maxWidth: 640, margin: "20px auto 0" }}>
            Post jobs, lock payment in escrow, deliver work, and let on-chain AI evaluate — across multiple independent validators. No middlemen. No bias.
          </p>
        </section>
        <StatsBar />
        <JobBoard />
        <HowItWorks />
        <footer className="section-sm container" style={{ textAlign: "center", borderTop: "1px solid var(--border)", paddingTop: 32 }}>
          <p className="body-sm" style={{ color: "var(--text-muted)" }}>
            Built on <a href="https://genlayer.com/" target="_blank" rel="noreferrer" style={{ color: "var(--amber-4)", textDecoration: "underline" }}>GenLayer</a> · Powered by AI Consensus · Non-Custodial
          </p>
        </footer>
      </main>
    </>
  );
};

export default Index;
