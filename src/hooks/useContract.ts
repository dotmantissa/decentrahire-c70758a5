import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { TransactionStatus } from "genlayer-js/types";
import { getWriteClient, CONTRACT_ADDRESS } from "@/lib/client";
import { useWallet } from "@/lib/wallet-context";
import type { TxState } from "@/lib/types";

const WAIT = { retries: 80, interval: 3000 };

export function useContract() {
  const { pk } = useWallet();
  const qc = useQueryClient();
  const [tx, setTx] = useState<TxState>({ loading: false, hash: null, error: null, success: false });

  const reset = useCallback(() => setTx({ loading: false, hash: null, error: null, success: false }), []);

  const write = useCallback(async (fn: string, args: unknown[], onDone?: (receipt: unknown) => void) => {
    if (!pk) { setTx({ loading: false, hash: null, error: "Connect your wallet first.", success: false }); return null; }
    if (!CONTRACT_ADDRESS) { setTx({ loading: false, hash: null, error: "Contract address not configured.", success: false }); return null; }

    setTx({ loading: true, hash: null, error: null, success: false });
    try {
      const client = getWriteClient(pk);
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS, functionName: fn, args, leaderOnly: false,
      });
      setTx(s => ({ ...s, hash }));

      const receipt = await client.waitForTransactionReceipt({
        hash, status: TransactionStatus.ACCEPTED, ...WAIT,
      });

      setTx({ loading: false, hash, error: null, success: true });
      await qc.invalidateQueries({ queryKey: ["jobs"] });
      await qc.invalidateQueries({ queryKey: ["balance"] });
      await qc.invalidateQueries({ queryKey: ["rep"] });
      await qc.invalidateQueries({ queryKey: ["jobCount"] });
      onDone?.(receipt);
      return receipt;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Transaction failed.";
      setTx({ loading: false, hash: null, error: msg, success: false });
      return null;
    }
  }, [pk, qc]);

  return {
    tx, reset,
    depositFunds: (amount: number, cb?: () => void) => write("deposit_funds", [amount], cb),
    withdrawFunds: (amount: number, cb?: () => void) => write("withdraw_funds", [amount], cb),
    postJob: (t: string, d: string, c: string, p: number, cb?: () => void) => write("post_job", [t, d, c, p], cb),
    acceptJob: (id: string, cb?: () => void) => write("accept_job", [id], cb),
    submitDeliverable: (id: string, url: string, cb?: () => void) => write("submit_deliverable", [id, url], cb),
    evaluateDeliverable: (id: string, cb?: () => void) => write("evaluate_deliverable", [id], cb),
    raiseDispute: (id: string, reason: string, cb?: () => void) => write("raise_dispute", [id, reason], cb),
    resolveDispute: (id: string, cb?: () => void) => write("resolve_dispute", [id], cb),
    cancelJob: (id: string, cb?: () => void) => write("cancel_job", [id], cb),
  };
}
