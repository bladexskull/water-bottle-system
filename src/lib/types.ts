export type Role = "member" | "admin";
export type SubmissionStatus = "pending" | "approved" | "rejected";
export type RegistrationStatus = "pending" | "approved" | "rejected";
export type MonthStatus = "open" | "closed";
export type CorrectionStatus = "pending" | "approved" | "rejected";
export type DinnerStatus = "draft" | "finalized";

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  role: Role;
  /** false until admin approves registration (or if deactivated later) */
  active: boolean;
  /** Registration gate: pending users can log in but cannot use the app */
  approvalStatus: RegistrationStatus;
  createdAt: string;
}

export interface MonthlyChallenge {
  month: string;
  status: MonthStatus;
  bottleSizeMl: number;
  minimumEligibleDays: number;
  createdAt: string;
  closedAt: string | null;
  winnerUid: string | null;
  lastPlaceUid: string | null;
  tieNeedsResolution: boolean;
}

export interface EligibleDaysDoc {
  uid: string;
  month: string;
  eligibleDays: number;
  startDate: string;
  endDate: string;
  updatedAt: string;
}

export interface DailySubmission {
  id: string;
  uid: string;
  date: string;
  month: string;
  bottles: number;
  basePoints: number;
  status: SubmissionStatus;
  note: string;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
}

export interface CorrectionRequest {
  id: string;
  submissionId: string;
  uid: string;
  oldBottles: number;
  requestedBottles: number;
  reason: string;
  status: CorrectionStatus;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

export interface AuditLog {
  id: string;
  actorUid: string;
  action: string;
  targetId: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface DinnerEvent {
  month: string;
  winnerUid: string | null;
  lastPlaceUid: string | null;
  totalBill: number;
  status: DinnerStatus;
  createdAt: string;
}

export interface DinnerParticipant {
  uid: string;
  participating: boolean;
  contribution: number;
}

export interface MemberStats {
  uid: string;
  name: string;
  email: string;
  eligibleDays: number;
  isEligible: boolean;
  totalBottles: number;
  basePoints: number;
  bonusPoints: number;
  totalPoints: number;
  strikeRate: number;
  fourPlusDays: number;
  tenPointDays: number;
  currentStreak: number;
  bestStreak: number;
  rank: number | null;
  pendingCount: number;
  rejectedCount: number;
}

export interface LeaderboardResult {
  month: string;
  bottleSizeMl: number;
  minimumEligibleDays: number;
  status: MonthStatus;
  members: MemberStats[];
  winnerUid: string | null;
  lastPlaceUid: string | null;
  tieNeedsResolution: boolean;
  eligibleCount: number;
  totalBottles: number;
  approvedSubmissions: number;
}
