import {
  calculateBasePoints,
  calculateStrikeRate,
  calculateDinnerContributions,
  compareMembers,
  rankMembers,
} from "../src/lib/scoring";
import type { MemberStats } from "../src/lib/types";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(calculateBasePoints(0) === 0, "0 bottles");
assert(calculateBasePoints(1) === 1, "1 bottle");
assert(calculateBasePoints(2) === 2, "2 bottles");
assert(calculateBasePoints(3) === 3, "3 bottles");
assert(calculateBasePoints(4) === 8, "4 bottles");
assert(calculateBasePoints(5) === 9, "5 bottles");
assert(calculateBasePoints(6) === 10, "6 bottles");
assert(calculateBasePoints(10) === 10, "10 bottles capped");
assert(calculateBasePoints(20) === 10, "20 bottles capped");
assert(Math.abs(calculateStrikeRate(150, 20) - 75) < 0.001, "SR 75%");
assert(calculateStrikeRate(0, 15) === 0, "SR zero");

const mk = (uid: string, days: number, sr: number, basePts: number): MemberStats => ({
  uid,
  name: uid,
  email: `${uid}@t.com`,
  eligibleDays: days,
  isEligible: days >= 15,
  totalBottles: 0,
  basePoints: basePts,
  bonusPoints: 0,
  totalPoints: basePts,
  strikeRate: sr,
  fourPlusDays: 0,
  tenPointDays: 0,
  currentStreak: 0,
  bestStreak: 0,
  rank: null,
  pendingCount: 0,
  rejectedCount: 0,
});

const ranked = rankMembers(
  [mk("a", 14, 99, 100), mk("b", 15, 50, 80), mk("c", 20, 75, 150)],
  15
);
assert(ranked.find((m) => m.uid === "a")!.rank === null, "14 days not ranked");
assert(ranked.find((m) => m.uid === "c")!.rank === 1, "highest SR wins");
assert(ranked.find((m) => m.uid === "b")!.rank === 2, "second");

const c = calculateDinnerContributions(5000, "w", "l", ["w", "l", "a", "b", "c"]);
assert(c.get("w") === 0, "winner 0");
assert(c.get("l") === 2500, "last 50%");
assert(Math.abs((c.get("a") || 0) - 833.33) < 0.01, "split");

const a: MemberStats = {
  uid: "a",
  name: "a",
  email: "a",
  eligibleDays: 20,
  isEligible: true,
  totalBottles: 0,
  basePoints: 100,
  bonusPoints: 0,
  totalPoints: 100,
  strikeRate: 50,
  fourPlusDays: 5,
  tenPointDays: 1,
  currentStreak: 0,
  bestStreak: 0,
  rank: null,
  pendingCount: 0,
  rejectedCount: 0,
};
const b = { ...a, uid: "b", name: "b", basePoints: 110 };
assert(compareMembers(b, a) < 0, "higher base breaks SR tie");

console.log("All scoring tests passed");
