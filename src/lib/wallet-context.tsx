import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { createAccount } from "genlayer-js";
import { getStoredPk, storePk, clearPk, pkToAddress } from "@/lib/client";

interface WalletCtx {
  address: string | null;
  pk: `0x${string}` | null;
  connected: boolean;
  connect: (pk: string) => void;
  generate: () => string;
  disconnect: () => void;
}

const Ctx = createContext<WalletCtx>({
  address: null, pk: null, connected: false,
  connect: () => {}, generate: () => "", disconnect: () => {},
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [pk, setPk] = useState<`0x${string}` | null>(null);
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredPk();
    if (stored) {
      try {
        setAddress(pkToAddress(stored));
        setPk(stored);
      } catch { clearPk(); }
    }
  }, []);

  const connect = useCallback((raw: string) => {
    const key = raw.trim() as `0x${string}`;
    const addr = pkToAddress(key);
    storePk(key);
    setPk(key);
    setAddress(addr);
  }, []);

  const generate = useCallback((): string => {
    const acc = createAccount();
    const key = acc.privateKey as `0x${string}`;
    storePk(key);
    setPk(key);
    setAddress(acc.address);
    return key;
  }, []);

  const disconnect = useCallback(() => {
    clearPk(); setPk(null); setAddress(null);
  }, []);

  return (
    <Ctx.Provider value={{ address, pk, connected: !!pk, connect, generate, disconnect }}>
      {children}
    </Ctx.Provider>
  );
}

export const useWallet = () => useContext(Ctx);
