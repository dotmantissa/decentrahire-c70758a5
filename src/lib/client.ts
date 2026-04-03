import { createClient, createAccount } from "genlayer-js";
import { simulator } from "genlayer-js/chains";

export const RPC_URL = "https://studio.genlayer.com/api";

export const CONTRACT_ADDRESS = "0x6f8893aE21847b4B4d37235222b0492729326744" as `0x${string}`;

/** Read-only client — no wallet needed for view calls */
export const readClient = createClient({
  chain: simulator,
  endpoint: RPC_URL,
  account: createAccount(),
});

/** Authenticated client from a stored private key */
export function getWriteClient(pk: `0x${string}`) {
  return createClient({
    chain: simulator,
    endpoint: RPC_URL,
    account: createAccount(pk),
  });
}

/** Derive address from private key */
export function pkToAddress(pk: `0x${string}`): string {
  try {
    return createAccount(pk).address;
  } catch {
    throw new Error("Invalid private key.");
  }
}

const LS_KEY = "dh_pk";

export function getStoredPk(): `0x${string}` | null {
  if (typeof window === "undefined") return null;
  return (localStorage.getItem(LS_KEY) as `0x${string}`) ?? null;
}
export function storePk(pk: `0x${string}`) {
  if (typeof window !== "undefined") localStorage.setItem(LS_KEY, pk);
}
export function clearPk() {
  if (typeof window !== "undefined") localStorage.removeItem(LS_KEY);
}
