import { format, parseISO, addDays, getISOWeek, getISOWeekYear } from "date-fns";
import type { DailySubmission, EligibleDaysDoc, MemberStats } from "./types";

/** Server-side only: never trust client basePoints. */
export function calculateBasePoints(bottles: number): number {
  if (!Number.isInteger(bottles) || bottles < 0) {
    throw new Error("Bottles must be a non-negative integer");
  }
  if (bottles === 0) return 0;
  if (bottles === 1) return 1;
  if (bottles === 2) return 2;
  if (bottles === 3) return 3;
  if (bottles === 4) return 8;
  if (bottles === 5) return 9;
  return 10; // 6+ capped
}

export function calculateStrikeRate(basePoints: number, eligibleDays: number): number {
  if (eligibleDays <= 0) return 0;
  return (basePoints / (eligibleDays * 10)) * 100;
}

export function formatStrikeRate(sr: number): string {
  return `${sr.toFixed(1)}%`;
}

function datesBetween(start: string, end: string): string[] {
  const out: string[] = [];
  let cur = parseISO(start);
  const last = parseISO(end);
  while (cur <= last) {
    out.push(format(cur, "yyyy-MM-dd"));
    cur = addDays(cur, 1);
  }
  return out;
}

function weekKey(dateStr: string): string {
  const d = parseISO(dateStr);
  return `${getISOWeekYear(d)}-W${String(getISOWeek(d)).padStart(2, "0")}`;
}

export function computeMemberBonuses(
  approvedByDate: Map<string, DailySubmission>,
  eligibility: EligibleDaysDoc | null
): {
  bonusPoints: number;
  fourPlusDays: number;
  tenPointDays: number;
  currentStreak: number;
  bestStreak: number;
  weeklyBaseByWeek: Map<string, number>;
} {
  const start = eligibility?.startDate;
  const end = eligibility?.endDate;
  const eligibleDates = start && end ? datesBetween(start, end) : [];

  let fourPlusDays = 0;
  let tenPointDays = 0;
  let streakBonus = 0;
  let run = 0;
  let bestStreak = 0;
  let currentStreak = 0;
  let streakActiveAtEnd = true;
  const weeklyBaseByWeek = new Map<string, number>();

  // Track streak lengths that completed (avoid double-counting 4 and 7)
  let awarded4 = false;
  let awarded7 = false;

  for (let i = 0; i < eligibleDates.length; i++) {
    const date = eligibleDates[i];
    const sub = approvedByDate.get(date);
    const bottles = sub?.bottles ?? 0;
    const pts = sub?.basePoints ?? 0;

    if (bottles >= 4) fourPlusDays++;
    if (pts >= 10) tenPointDays++;

    const wk = weekKey(date);
    weeklyBaseByWeek.set(wk, (weeklyBaseByWeek.get(wk) ?? 0) + pts);

    if (bottles >= 4) {
      run++;
      bestStreak = Math.max(bestStreak, run);
      if (run === 4 && !awarded4) {
        streakBonus += 5;
        awarded4 = true;
      }
      if (run === 7 && !awarded7) {
        streakBonus += 10;
        awarded7 = true;
      }
      // Reset award flags when streak breaks so a new streak can earn again
      // Only one 4-day and one 7-day award per continuous streak segment
    } else {
      run = 0;
      awarded4 = false;
      awarded7 = false;
      streakActiveAtEnd = false;
    }
  }

  // Current streak: trailing consecutive 4+ from end of eligible window
  currentStreak = 0;
  for (let i = eligibleDates.length - 1; i >= 0; i--) {
    const sub = approvedByDate.get(eligibleDates[i]);
    if ((sub?.bottles ?? 0) >= 4) currentStreak++;
    else break;
  }
  if (!streakActiveAtEnd && eligibleDates.length === 0) currentStreak = 0;

  let monthlyAchievement = 0;
  if (fourPlusDays >= 25) monthlyAchievement = 25;
  else if (fourPlusDays >= 20) monthlyAchievement = 15;

  return {
    bonusPoints: streakBonus + monthlyAchievement,
    fourPlusDays,
    tenPointDays,
    currentStreak,
    bestStreak,
    weeklyBaseByWeek,
  };
}

export function applyWeeklyBonuses(
  memberWeekly: Map<string, Map<string, number>>
): Map<string, number> {
  // uid -> weekly bonus points
  const bonuses = new Map<string, number>();
  const weeks = new Set<string>();
  for (const wkMap of memberWeekly.values()) {
    for (const wk of wkMap.keys()) weeks.add(wk);
  }

  for (const week of weeks) {
    const scores: { uid: string; pts: number }[] = [];
    for (const [uid, wkMap] of memberWeekly) {
      scores.push({ uid, pts: wkMap.get(week) ?? 0 });
    }
    scores.sort((a, b) => b.pts - a.pts);
    if (scores.length === 0) continue;
    if (scores[0].pts > 0) {
      bonuses.set(scores[0].uid, (bonuses.get(scores[0].uid) ?? 0) + 5);
    }
    if (scores.length > 1 && scores[1].pts > 0 && scores[1].pts < scores[0].pts) {
      bonuses.set(scores[1].uid, (bonuses.get(scores[1].uid) ?? 0) + 3);
    } else if (
      scores.length > 1 &&
      scores[1].pts > 0 &&
      scores[1].pts === scores[0].pts
    ) {
      // Tie for first: both get +5, no second
      bonuses.set(scores[1].uid, (bonuses.get(scores[1].uid) ?? 0) + 5);
    } else if (scores.length > 1 && scores[1].pts > 0) {
      bonuses.set(scores[1].uid, (bonuses.get(scores[1].uid) ?? 0) + 3);
    }
  }
  return bonuses;
}

export function compareMembers(a: MemberStats, b: MemberStats): number {
  // Higher strike rate first
  if (b.strikeRate !== a.strikeRate) return b.strikeRate - a.strikeRate;
  if (b.basePoints !== a.basePoints) return b.basePoints - a.basePoints;
  if (b.fourPlusDays !== a.fourPlusDays) return b.fourPlusDays - a.fourPlusDays;
  if (b.tenPointDays !== a.tenPointDays) return b.tenPointDays - a.tenPointDays;
  return 0;
}

export function rankMembers(members: MemberStats[], minEligible: number): MemberStats[] {
  const eligible = members.filter((m) => m.eligibleDays >= minEligible);
  const ineligible = members.filter((m) => m.eligibleDays < minEligible);

  eligible.sort(compareMembers);

  let rank = 1;
  for (let i = 0; i < eligible.length; i++) {
    if (i > 0 && compareMembers(eligible[i - 1], eligible[i]) === 0) {
      eligible[i].rank = eligible[i - 1].rank;
    } else {
      eligible[i].rank = rank;
    }
    rank = i + 2;
  }

  for (const m of ineligible) {
    m.rank = null;
    m.isEligible = false;
  }
  for (const m of eligible) m.isEligible = true;

  return [...eligible, ...ineligible];
}

export function detectWinnerLastPlace(ranked: MemberStats[]): {
  winnerUid: string | null;
  lastPlaceUid: string | null;
  tieNeedsResolution: boolean;
} {
  const eligible = ranked.filter((m) => m.isEligible && m.rank !== null);
  if (eligible.length === 0) {
    return { winnerUid: null, lastPlaceUid: null, tieNeedsResolution: false };
  }

  const winners = eligible.filter((m) => m.rank === 1);
  const maxRank = Math.max(...eligible.map((m) => m.rank!));
  const lastPlaces = eligible.filter((m) => m.rank === maxRank);

  const winnerTie = winners.length > 1;
  const lastTie = lastPlaces.length > 1 && eligible.length > 1;

  return {
    winnerUid: winnerTie ? null : winners[0]?.uid ?? null,
    lastPlaceUid: lastTie ? null : lastPlaces[0]?.uid ?? null,
    tieNeedsResolution: winnerTie || lastTie,
  };
}

export function calculateDinnerContributions(
  totalBill: number,
  winnerUid: string,
  lastPlaceUid: string,
  participantUids: string[]
): Map<string, number> {
  const result = new Map<string, number>();
  const half = totalBill / 2;
  result.set(winnerUid, 0);
  result.set(lastPlaceUid, half);

  const others = participantUids.filter(
    (uid) => uid !== winnerUid && uid !== lastPlaceUid
  );
  const share = others.length > 0 ? half / others.length : 0;
  for (const uid of others) {
    result.set(uid, Math.round(share * 100) / 100);
  }
  // If last place is also in participants list, keep 50%
  if (!result.has(lastPlaceUid)) result.set(lastPlaceUid, half);
  return result;
}
