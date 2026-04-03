import { useState } from "react";
import { useWallet } from "@/lib/wallet-context";
import { useBalance } from "@/hooks/useQueries";
import { truncAddr } from "@/lib/types";
import { WalletDrawer } from "./WalletDrawer";
import { RepCard } from "./RepCard";

export function Header() {
  const { address, connected, disconnect } = useWallet();
  const { data: balance } = useBalance(address);
  const [walletOpen, setWalletOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <>
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(14,10,5,0.85)", backdropFilter: "blur(16px)", borderBottom: "1px solid var(--border)" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 22 }}>⚡</span>
            <span className="display-sm gold-text">DecentraHire</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {connected && address ? (
              <>
                <button className="btn btn-ghost btn-sm" onClick={() => setProfileOpen(!profileOpen)}>
                  {truncAddr(address)} · {balance ?? 0} $GEN
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setWalletOpen(true)}>💰</button>
                <button className="btn btn-danger btn-sm" onClick={disconnect}>Disconnect</button>
              </>
            ) : (
              <button className="btn btn-gold" onClick={() => setWalletOpen(true)}>Connect Wallet</button>
            )}
          </div>
        </div>

        {profileOpen && connected && address && (
          <div className="container" style={{ paddingBottom: 16 }}>
            <RepCard address={address} />
          </div>
        )}
      </header>

      {walletOpen && <WalletDrawer onClose={() => setWalletOpen(false)} />}
    </>
  );
}
