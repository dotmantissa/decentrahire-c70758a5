import { useQuery } from "@tanstack/react-query";
import { readClient, CONTRACT_ADDRESS } from "@/lib/client";
import { safeJson } from "@/lib/types";
import type { Job, Reputation } from "@/lib/types";

const NO_ADDR = !CONTRACT_ADDRESS;

async function call(fn: string, args: unknown[] = []) {
  return readClient.readContract({ address: CONTRACT_ADDRESS, functionName: fn, args });
}

export function useAllJobs() {
  return useQuery({
    queryKey: ["jobs"],
    enabled: !NO_ADDR,
    queryFn: async () => safeJson<Job[]>(await call("get_all_jobs"), []),
    refetchInterval: 12_000,
  });
}

export function useJob(id: string | null) {
  return useQuery({
    queryKey: ["job", id],
    enabled: !!id && !NO_ADDR,
    queryFn: async () => {
      const raw = await call("get_job", [id]);
      const j = safeJson<Job>(raw, {} as Job);
      return j.job_id ? j : null;
    },
    refetchInterval: 8_000,
  });
}

export function useReputation(address: string | null) {
  return useQuery({
    queryKey: ["rep", address],
    enabled: !!address && !NO_ADDR,
    queryFn: async () => safeJson<Reputation>(await call("get_reputation", [address]), {
      address: address!, jobs_completed: 0, jobs_posted: 0,
      disputes_won: 0, disputes_lost: 0, total_earned: 0,
    }),
    refetchInterval: 20_000,
  });
}

export function useBalance(address: string | null) {
  return useQuery({
    queryKey: ["balance", address],
    enabled: !!address && !NO_ADDR,
    queryFn: async () => {
      const raw = await call("get_balance", [address]);
      return typeof raw === "bigint" ? Number(raw) : Number(raw ?? 0);
    },
    refetchInterval: 10_000,
  });
}

export function useJobCount() {
  return useQuery({
    queryKey: ["jobCount"],
    enabled: !NO_ADDR,
    queryFn: async () => {
      const raw = await call("get_job_count");
      return typeof raw === "bigint" ? Number(raw) : Number(raw ?? 0);
    },
    refetchInterval: 15_000,
  });
}
