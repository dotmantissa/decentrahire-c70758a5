export type JobStatus =
  | "OPEN"
  | "ACTIVE"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "DISPUTED"
  | "RESOLVED_FREELANCER"
  | "RESOLVED_CLIENT"
  | "CANCELLED";

export interface Job {
  job_id: string;
  client: string;
  freelancer: string;
  title: string;
  description: string;
  criteria: string;
  payment_amount: number;
  deliverable_url: string;
  status: JobStatus;
  ai_verdict: string;
  ai_reasoning: string;
  ai_criteria_met: string[];
  ai_criteria_failed: string[];
  dispute_reason: string;
  dispute_verdict: string;
  dispute_reasoning: string;
  dispute_key_finding: string;
}

export interface Reputation {
  address: string;
  jobs_completed: number;
  jobs_posted: number;
  disputes_won: number;
  disputes_lost: number;
  total_earned: number;
}

export interface TxState {
  loading: boolean;
  hash: string | null;
  error: string | null;
  success: boolean;
}

export const EMPTY_TX: TxState = { loading: false, hash: null, error: null, success: false };

export const STATUS_LABEL: Record<JobStatus, string> = {
  OPEN: "Open",
  ACTIVE: "In Progress",
  PENDING_REVIEW: "Awaiting Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  DISPUTED: "Disputed",
  RESOLVED_FREELANCER: "Freelancer Won",
  RESOLVED_CLIENT: "Client Won",
  CANCELLED: "Cancelled",
};

export const STATUS_CLASS: Record<JobStatus, string> = {
  OPEN: "badge-open",
  ACTIVE: "badge-active",
  PENDING_REVIEW: "badge-pending",
  APPROVED: "badge-approved",
  REJECTED: "badge-rejected",
  DISPUTED: "badge-disputed",
  RESOLVED_FREELANCER: "badge-resolved-f",
  RESOLVED_CLIENT: "badge-resolved-c",
  CANCELLED: "badge-cancelled",
};

export const STATUS_ICON: Record<JobStatus, string> = {
  OPEN: "◎",
  ACTIVE: "◈",
  PENDING_REVIEW: "◐",
  APPROVED: "✦",
  REJECTED: "✕",
  DISPUTED: "⚡",
  RESOLVED_FREELANCER: "✦",
  RESOLVED_CLIENT: "✦",
  CANCELLED: "○",
};

export function repScore(rep: Reputation) {
  return rep.jobs_completed * 10 + rep.disputes_won * 5 - rep.disputes_lost * 8;
}

export function repTier(score: number): { label: string; color: string; bg: string } {
  if (score >= 100) return { label: "Guild Master", color: "var(--amber-2)", bg: "rgba(245,158,11,0.12)" };
  if (score >= 50) return { label: "Trusted", color: "var(--green)", bg: "rgba(134,239,172,0.1)" };
  if (score >= 15) return { label: "Rising", color: "var(--blue)", bg: "rgba(147,197,253,0.1)" };
  return { label: "Newcomer", color: "var(--warm-1)", bg: "rgba(168,149,106,0.1)" };
}

export function truncAddr(addr: string, chars = 6) {
  if (!addr) return "—";
  return `${addr.slice(0, chars)}…${addr.slice(-4)}`;
}

export function safeJson<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== "string") return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
