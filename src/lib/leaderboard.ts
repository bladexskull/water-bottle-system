import { adminDb, FieldValue } from "./firebase/admin";
import { currentMonth, monthBounds } from "./dates";
import {
  applyWeeklyBonuses,
  calculateStrikeRate,
  computeMemberBonuses,
  detectWinnerLastPlace,
  rankMembers,
} from "./scoring";
import type {
  AppUser,
  DailySubmission,
  EligibleDaysDoc,
  LeaderboardResult,
  MemberStats,
  MonthlyChallenge,
} from "./types";

const MIN_ELIGIBLE = 15;
const DEFAULT_BOTTLE_ML = 1000;

export async function ensureMonth(month = currentMonth()): Promise<MonthlyChallenge> {
  const db = adminDb();
  const ref = db.collection("monthlyChallenges").doc(month);
  const snap = await ref.get();
  if (snap.exists) return snap.data() as MonthlyChallenge;

  const bounds = monthBounds(month);
  const doc: MonthlyChallenge = {
    month,
    status: "open",
    bottleSizeMl: DEFAULT_BOTTLE_ML,
    minimumEligibleDays: MIN_ELIGIBLE,
    createdAt: new Date().toISOString(),
    closedAt: null,
    winnerUid: null,
    lastPlaceUid: null,
    tieNeedsResolution: false,
  };
  await ref.set(doc);

  // Seed empty eligibility placeholders are created when admin sets them
  void bounds;
  return doc;
}

export async function writeAudit(
  actorUid: string,
  action: string,
  targetId: string,
  details: Record<string, unknown> = {}
) {
  await adminDb().collection("auditLogs").add({
    actorUid,
    action,
    targetId,
    details,
    createdAt: new Date().toISOString(),
  });
}

export async function computeLeaderboard(month = currentMonth()): Promise<LeaderboardResult> {
  const db = adminDb();
  const challenge = await ensureMonth(month);

  const usersSnap = await db.collection("users").where("active", "==", true).get();
  const users = usersSnap.docs
    .map((d) => d.data() as AppUser)
    .filter((u) => (u.approvalStatus || "approved") === "approved");

  const subsSnap = await db
    .collection("dailySubmissions")
    .where("month", "==", month)
    .get();
  const submissions = subsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as DailySubmission));

  const eligSnap = await db
    .collection("eligibleDays")
    .where("month", "==", month)
    .get();
  const eligibilityByUid = new Map<string, EligibleDaysDoc>();
  eligSnap.docs.forEach((d) => {
    const data = d.data() as EligibleDaysDoc;
    eligibilityByUid.set(data.uid, data);
  });

  const memberWeekly = new Map<string, Map<string, number>>();
  const stats: MemberStats[] = [];

  let totalBottles = 0;
  let approvedSubmissions = 0;

  for (const user of users) {
    if (user.role === "admin" && users.length > 1) {
      // Admin can still participate if they have eligibility; include all active users
    }

    const mine = submissions.filter((s) => s.uid === user.uid);
    const approved = mine.filter((s) => s.status === "approved");
    const approvedByDate = new Map(approved.map((s) => [s.date, s]));

    const elig = eligibilityByUid.get(user.uid) || null;
    const eligibleDays = elig?.eligibleDays ?? 0;

    const basePoints = approved.reduce((sum, s) => sum + (s.basePoints || 0), 0);
    const bottles = approved.reduce((sum, s) => sum + (s.bottles || 0), 0);
    totalBottles += bottles;
    approvedSubmissions += approved.length;

    const bonuses = computeMemberBonuses(approvedByDate, elig);
    memberWeekly.set(user.uid, bonuses.weeklyBaseByWeek);

    stats.push({
      uid: user.uid,
      name: user.name,
      email: user.email,
      eligibleDays,
      isEligible: eligibleDays >= challenge.minimumEligibleDays,
      totalBottles: bottles,
      basePoints,
      bonusPoints: bonuses.bonusPoints, // weekly added below
      totalPoints: basePoints + bonuses.bonusPoints,
      strikeRate: calculateStrikeRate(basePoints, eligibleDays),
      fourPlusDays: bonuses.fourPlusDays,
      tenPointDays: bonuses.tenPointDays,
      currentStreak: bonuses.currentStreak,
      bestStreak: bonuses.bestStreak,
      rank: null,
      pendingCount: mine.filter((s) => s.status === "pending").length,
      rejectedCount: mine.filter((s) => s.status === "rejected").length,
    });
  }

  const weeklyBonuses = applyWeeklyBonuses(memberWeekly);
  for (const s of stats) {
    const wb = weeklyBonuses.get(s.uid) ?? 0;
    s.bonusPoints += wb;
    s.totalPoints = s.basePoints + s.bonusPoints;
  }

  const ranked = rankMembers(stats, challenge.minimumEligibleDays);
  const { winnerUid, lastPlaceUid, tieNeedsResolution } = detectWinnerLastPlace(ranked);

  return {
    month,
    bottleSizeMl: challenge.bottleSizeMl,
    minimumEligibleDays: challenge.minimumEligibleDays,
    status: challenge.status,
    members: ranked,
    winnerUid: challenge.status === "closed" ? challenge.winnerUid : winnerUid,
    lastPlaceUid: challenge.status === "closed" ? challenge.lastPlaceUid : lastPlaceUid,
    tieNeedsResolution:
      challenge.status === "closed" ? challenge.tieNeedsResolution : tieNeedsResolution,
    eligibleCount: ranked.filter((m) => m.isEligible).length,
    totalBottles,
    approvedSubmissions,
  };
}

export async function freezeMonthResults(month: string, actorUid: string) {
  const board = await computeLeaderboard(month);
  const db = adminDb();
  await db.collection("monthlyChallenges").doc(month).update({
    status: "closed",
    closedAt: new Date().toISOString(),
    winnerUid: board.winnerUid,
    lastPlaceUid: board.lastPlaceUid,
    tieNeedsResolution: board.tieNeedsResolution,
  });
  await writeAudit(actorUid, "month_closed", month, {
    winnerUid: board.winnerUid,
    lastPlaceUid: board.lastPlaceUid,
    tieNeedsResolution: board.tieNeedsResolution,
  });
  return board;
}

export async function reopenMonth(month: string, actorUid: string) {
  const db = adminDb();
  await db.collection("monthlyChallenges").doc(month).update({
    status: "open",
    closedAt: null,
  });
  await writeAudit(actorUid, "month_reopened", month, {});
}

/** Used only to satisfy FieldValue import usage for future batch ops */
export const _fieldValue = FieldValue;
