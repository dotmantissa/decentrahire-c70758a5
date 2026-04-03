import { useState } from "react";
import { useWallet } from "@/lib/wallet-context";
import { useContract } from "@/hooks/useContract";
import { useBalance } from "@/hooks/useQueries";
import { TxBanner } from "./TxBanner";

export function WalletDrawer({ onClose }: { onClose: () => void }) {
  const { connect, generate, address, connected } = useWallet();
  const { tx, reset, depositFunds, withdrawFunds } = useContract();
  const { data: balance } = useBalance(address);

  const [tab, setTab] = useState<"connect" | "funds">(connected ? "funds" : "connect");
  const [pkInput, setPkInput] = useState("");
  const [pkErr, setPkErr] = useState("");
  const [depAmt, setDepAmt] = useState("");
  const [wdAmt, setWdAmt] = useState("");
  const [generated, setGenerated] = useState<string | null>(null);

  function handleConnect() {
    setPkErr("");
    if (!pkInput.trim()) { setPkErr("Enter a private key."); return; }
    try { connect(pkInput); setTab("funds"); }
    catch (e: unknown) { setPkErr(e instanceof Error ? e.message : "Invalid key."); }
  }

  function handleGenerate() {
    const pk = generate();
    setGenerated(pk);
    setTab("funds");
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 className="display-md">{connected ? "Wallet" : "Connect to DecentraHire"}</h2>
            <button onClick={onClose} className="btn btn-ghost btn-sm">×</button>
          </div>
          <div className="tabs" style={{ marginTop: 16 }}>
            <button className={`tab ${tab === "connect" ? "active" : ""}`} onClick={() => setTab("connect")}>🔑 Account</button>
            <button className={`tab ${tab === "funds" ? "active" : ""}`} onClick={() => setTab("funds")}>💰 Funds</button>
          </div>
        </div>

        {tab === "connect" && (
          <div className="modal-body">
            {connected && address ? (
              <div className="card" style={{ padding: 20, textAlign: "center" }}>
                <div style={{ color: "var(--green)", fontWeight: 600, marginBottom: 8 }}>✦ Wallet Connected</div>
                <div className="address">{address}</div>
              </div>
            ) : (
              <>
                <div className="card" style={{ padding: 16, marginBottom: 20 }}>
                  <div className="label-caps" style={{ marginBottom: 8 }}>How to get an account</div>
                  <ol className="body-sm" style={{ color: "var(--text-secondary)", paddingLeft: 20, lineHeight: 1.8 }}>
                    <li>Visit <a href="https://studio.genlayer.com/" target="_blank" rel="noreferrer" style={{ color: "var(--amber-4)", textDecoration: "underline" }}>studio.genlayer.com</a></li>
                    <li>Create a free account — no wallet extension needed</li>
                    <li>Go to <strong>Accounts</strong> and copy your private key</li>
                    <li>Paste it below</li>
                  </ol>
                  <div className="body-sm" style={{ color: "var(--terra-2)", marginTop: 8 }}>⚠ This is a testnet. Never use a key that holds real funds.</div>
                </div>

                <label className="field-label">Private Key</label>
                <input className="input" type="password" placeholder="0x…" value={pkInput} onChange={e => setPkInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleConnect()} />
                {pkErr && <div className="body-sm danger" style={{ marginTop: 6 }}>{pkErr}</div>}

                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button className="btn btn-gold" style={{ flex: 1 }} onClick={handleConnect}>Connect</button>
                </div>
                <div className="ornament" style={{ margin: "20px 0" }}>or</div>
                <button className="btn btn-outline" style={{ width: "100%" }} onClick={handleGenerate}>✦ Generate a fresh test wallet</button>

                {generated && (
                  <div className="card" style={{ padding: 16, marginTop: 16 }}>
                    <div className="label-caps" style={{ marginBottom: 8 }}>Your new private key — save it!</div>
                    <div className="address" style={{ wordBreak: "break-all" }}>{generated}</div>
                    <div className="body-sm" style={{ color: "var(--text-muted)", marginTop: 8 }}>This key is stored in your browser. Copy it somewhere safe — losing it means losing access.</div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === "funds" && (
          <div className="modal-body">
            {!connected ? (
              <div style={{ textAlign: "center", padding: 20, color: "var(--text-muted)" }}>
                Connect a wallet first to manage funds.
              </div>
            ) : (
              <>
                <div className="card" style={{ padding: 20, textAlign: "center", marginBottom: 20 }}>
                  <div className="label-caps" style={{ marginBottom: 8 }}>Your Balance</div>
                  <div style={{ fontSize: 36, fontWeight: 700, color: "var(--amber-3)" }}>{balance ?? 0}</div>
                  <div className="label-caps" style={{ marginTop: 4 }}>$GEN Tokens</div>
                  <div className="body-sm" style={{ color: "var(--text-muted)", marginTop: 12 }}>
                    Funds are held in the contract's escrow ledger. Deposit before posting jobs. Withdraw earned tokens at any time.
                  </div>
                </div>

                <TxBanner tx={tx} onDismiss={reset} />

                <div style={{ marginTop: 16 }}>
                  <label className="field-label">Deposit $GEN Tokens</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input className="input" type="number" placeholder="Amount" value={depAmt} onChange={e => setDepAmt(e.target.value)} />
                    <button className="btn btn-gold" disabled={tx.loading || !depAmt} onClick={() => { reset(); depositFunds(Number(depAmt), () => setDepAmt("")); }} style={{ flexShrink: 0 }}>Deposit</button>
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <label className="field-label">Withdraw $GEN Tokens</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input className="input" type="number" placeholder="Amount" value={wdAmt} onChange={e => setWdAmt(e.target.value)} />
                    <button className="btn btn-outline" disabled={tx.loading || !wdAmt} onClick={() => { reset(); withdrawFunds(Number(wdAmt), () => setWdAmt("")); }} style={{ flexShrink: 0 }}>Withdraw</button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
