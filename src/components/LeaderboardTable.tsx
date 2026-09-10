"use client";

import type { MemberStats } from "@/lib/types";
import { formatStrikeRate } from "@/lib/scoring";

interface Props {
  members: MemberStats[];
  currentUid?: string;
  winnerUid?: string | null;
  lastPlaceUid?: string | null;
  compact?: boolean;
}

export function LeaderboardTable({
  members,
  currentUid,
  winnerUid,
  lastPlaceUid,
  compact,
}: Props) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-cyan-900/10 bg-white/80">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-cyan-900/10 bg-cyan-50/80 text-[11px] uppercase tracking-wider text-cyan-800/70">
            <th className="px-3 py-2.5">Rank</th>
            <th className="px-3 py-2.5">Member</th>
            <th className="px-3 py-2.5">SR</th>
            {!compact && (
              <>
                <th className="px-3 py-2.5">Days</th>
                <th className="px-3 py-2.5">Bottles</th>
                <th className="px-3 py-2.5">Base</th>
                <th className="px-3 py-2.5">Bonus</th>
                <th className="px-3 py-2.5">Total</th>
                <th className="px-3 py-2.5">4+</th>
                <th className="px-3 py-2.5">Streak</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {members.map((m) => {
            const isYou = m.uid === currentUid;
            const isWinner = m.uid === winnerUid;
            const isLast = m.uid === lastPlaceUid;
            return (
              <tr
                key={m.uid}
                className={`border-b border-cyan-900/5 ${
                  isYou ? "bg-cyan-50" : ""
                } ${isWinner ? "bg-amber-50/80" : ""} ${isLast ? "bg-rose-50/50" : ""}`}
              >
                <td className="px-3 py-2.5 font-semibold tabular-nums text-cyan-950">
                  {m.isEligible ? (
                    <>
                      {isWinner ? "🏆 " : isLast ? "💀 " : ""}
                      {m.rank}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <p className="font-medium text-cyan-950">
                    {m.name}
                    {isYou ? " (you)" : ""}
                  </p>
                  {!m.isEligible && (
                    <p className="text-[11px] text-amber-700">Not eligible for monthly ranking</p>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-base font-bold tabular-nums text-cyan-700">
                    {formatStrikeRate(m.strikeRate)}
                  </span>
                </td>
                {!compact && (
                  <>
                    <td className="px-3 py-2.5 tabular-nums">{m.eligibleDays}</td>
                    <td className="px-3 py-2.5 tabular-nums">{m.totalBottles}</td>
                    <td className="px-3 py-2.5 tabular-nums">{m.basePoints}</td>
                    <td className="px-3 py-2.5 tabular-nums">{m.bonusPoints}</td>
                    <td className="px-3 py-2.5 font-semibold tabular-nums">{m.totalPoints}</td>
                    <td className="px-3 py-2.5 tabular-nums">{m.fourPlusDays}</td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {m.currentStreak}/{m.bestStreak}
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
