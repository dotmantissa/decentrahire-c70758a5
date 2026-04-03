import type { TxState } from "@/lib/types";

export function TxBanner({ tx, onDismiss }: { tx: TxState; onDismiss?: () => void }) {
  if (!tx.loading && !tx.error && !tx.success) return null;

  const cls = tx.loading ? "tx-loading" : tx.error ? "tx-error" : "tx-success";
  const icon = tx.loading
    ? <span className="anim-spin" style={{ display: "inline-block", width: 18, height: 18, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%" }} />
    : tx.error ? "✕" : "✦";

  return (
    <div className={`tx-banner ${cls}`}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        {tx.loading && (
          <>
            <div style={{ fontWeight: 600 }}>Broadcasting transaction…</div>
            {tx.hash && <div className="mono" style={{ marginTop: 4, wordBreak: "break-all", opacity: 0.7 }}>{tx.hash}</div>}
            <div style={{ marginTop: 6, opacity: 0.7 }}>Waiting for validator consensus — this may take 30–60 seconds.</div>
          </>
        )}
        {tx.error && <div>{tx.error}</div>}
        {tx.success && !tx.loading && <div>Transaction confirmed ✦</div>}
      </div>
      {!tx.loading && onDismiss && (
        <button onClick={onDismiss} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 18, padding: 4 }}>×</button>
      )}
    </div>
  );
}
