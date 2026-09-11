"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, apiFetch, isApprovedMember } from "@/lib/auth-context";
import { Navbar } from "@/components/Navbar";
import { BottleCounter } from "@/components/BottleCounter";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { LoadingScreen, StatCard } from "@/components/ui";
import { formatStrikeRate } from "@/lib/scoring";
import { daysRemainingInMonth } from "@/lib/dates";
import type { LeaderboardResult, DailySubmission } from "@/lib/types";

export default function MemberPage() {
  const { user, profile, loading, getIdToken, configured } = useAuth();
  const router = useRouter();
  const [board, setBoard] = useState<LeaderboardResult | null>(null);
  const [today, setToday] = useState<DailySubmission | null>(null);
  const [bottles, setBottles] = useState(4);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showSubmit, setShowSubmit] = useState(false);
  const [corrOpen, setCorrOpen] = useState(false);
  const [corrBottles, setCorrBottles] = useState(0);
  const [corrReason, setCorrReason] = useState("");

  const refresh = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    const [lb, subs] = await Promise.all([
      apiFetch("/api/leaderboard", token),
      apiFetch("/api/submissions", token),
    ]);
    setBoard(lb);
    setToday(subs.today);
  }, [getIdToken]);

  useEffect(() => {
    if (loading) return;
    if (!configured) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (profile && !isApprovedMember(profile)) {
      router.replace("/pending");
      return;
    }
    refresh().catch((e) => setError(e.message));
  }, [user, profile, loading, configured, router, refresh]);

  async function submitToday() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const token = await getIdToken();
      await apiFetch("/api/submissions", token, {
        method: "POST",
        body: JSON.stringify({ bottles, note: note.trim() }),
      });
      setMessage("Submitted for approval");
      setShowSubmit(false);
      setNote("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  async function requestCorrection() {
    if (!today || today.status !== "approved") return;
    setBusy(true);
    setError("");
    try {
      const token = await getIdToken();
      await apiFetch("/api/corrections", token, {
        method: "POST",
        body: JSON.stringify({
          action: "request",
          submissionId: today.id || `${today.date}_${today.uid}`,
          requestedBottles: corrBottles,
          reason: corrReason,
        }),
      });
      setMessage("Correction requested");
      setCorrOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !profile) return <LoadingScreen />;
  if (!isApprovedMember(profile)) return <LoadingScreen message="Redirecting…" />;
  if (!board && !error) return <LoadingScreen message="Loading your dashboard…" />;

  const me = board?.members.find((m) => m.uid === profile.uid);
  const month = board?.month || "";
  const bottleMl = board?.bottleSizeMl || 1000;
  const daysLeft = month ? daysRemainingInMonth(month) : 0;

  return (
    <div className="min-h-screen pb-16">
      <Navbar />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-cyan-950">Hey, {profile.name}</h1>
          <p className="text-sm text-cyan-800/60">
            {month} · Bottle size {bottleMl} ml · Game tracking only, not medical advice
          </p>
        </div>

        {(error || message) && (
          <p className={`text-sm ${error ? "text-rose-700" : "text-emerald-700"}`}>
            {error || message}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="🏆 Rank"
            value={me?.isEligible && me.rank ? `#${me.rank}` : "—"}
            hint={me && !me.isEligible ? "Not eligible" : undefined}
            accent="amber"
          />
          <StatCard
            label="⚡ Strike Rate"
            value={me ? formatStrikeRate(me.strikeRate) : "—"}
            accent="cyan"
          />
          <StatCard label="💧 Total Points" value={me?.totalPoints ?? 0} />
          <StatCard label="💦 Bottles" value={me?.totalBottles ?? 0} />
          <StatCard label="🔥 Streak" value={me?.currentStreak ?? 0} accent="rose" />
          <StatCard label="🏅 Best Streak" value={me?.bestStreak ?? 0} accent="emerald" />
          <StatCard label="4+ Days" value={me?.fourPlusDays ?? 0} />
          <StatCard
            label="Eligible Days"
            value={`${me?.eligibleDays ?? 0}`}
            hint={month ? `${daysLeft} days left in month` : undefined}
          />
        </div>

        <section className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">Today&apos;s bottles</h2>
              <p className="text-sm text-cyan-800/60">
                Status:{" "}
                <span className="font-semibold uppercase">
                  {today?.status || "not submitted"}
                </span>
                {today ? ` · ${today.bottles} bottles` : ""}
              </p>
              {today?.note ? (
                <p className="mt-1 text-sm text-cyan-800/70">Note: {today.note}</p>
              ) : null}
              {today?.status === "rejected" && (
                <p className="mt-1 text-sm text-rose-700">
                  Rejected: {today.rejectionReason}
                </p>
              )}
            </div>
            {!today && board?.status === "open" && (
              <button className="btn-primary" onClick={() => setShowSubmit(true)}>
                Submit Today&apos;s Bottles
              </button>
            )}
            {today?.status === "approved" && board?.status === "open" && (
              <button
                className="rounded-xl border border-cyan-800/20 px-4 py-2 text-sm font-semibold"
                onClick={() => {
                  setCorrBottles(today.bottles);
                  setCorrOpen(true);
                }}
              >
                Request correction
              </button>
            )}
          </div>

          {(me?.pendingCount || 0) > 0 && (
            <p className="mt-3 text-sm text-amber-700">
              {me!.pendingCount} pending approval
            </p>
          )}
          {(me?.rejectedCount || 0) > 0 && (
            <p className="mt-1 text-sm text-rose-700">{me!.rejectedCount} rejected this month</p>
          )}
        </section>

        {showSubmit && (
          <section className="card space-y-5 p-6">
            <h2 className="font-display text-center text-xl font-semibold">
              How many bottles did you fill today?
            </h2>
            <p className="text-center text-xs text-cyan-800/50">
              Each bottle = {bottleMl} ml. Don&apos;t force unsafe intake.
            </p>
            <BottleCounter value={bottles} onChange={setBottles} />
            <label className="block text-sm">
              Note for admin (optional)
              <textarea
                className="input mt-1"
                rows={2}
                maxLength={200}
                placeholder="e.g. filled at office cooler"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <div className="flex gap-3">
              <button
                className="flex-1 rounded-xl border border-cyan-800/15 py-3 font-medium"
                onClick={() => setShowSubmit(false)}
              >
                Cancel
              </button>
              <button className="btn-primary flex-1" disabled={busy} onClick={submitToday}>
                {busy ? "Submitting…" : "Submit for approval"}
              </button>
            </div>
          </section>
        )}

        {corrOpen && (
          <section className="card space-y-3 p-5">
            <h3 className="font-semibold">Request correction</h3>
            <label className="text-sm">
              Correct bottles
              <input
                className="input mt-1"
                type="number"
                min={0}
                max={50}
                value={corrBottles}
                onChange={(e) => setCorrBottles(Number(e.target.value))}
              />
            </label>
            <label className="text-sm">
              Reason
              <textarea
                className="input mt-1"
                rows={2}
                value={corrReason}
                onChange={(e) => setCorrReason(e.target.value)}
              />
            </label>
            <div className="flex gap-2">
              <button className="rounded-xl border px-4 py-2 text-sm" onClick={() => setCorrOpen(false)}>
                Cancel
              </button>
              <button className="btn-primary text-sm" disabled={busy} onClick={requestCorrection}>
                Send request
              </button>
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-3 font-display text-lg font-semibold">Leaderboard</h2>
          {board && (
            <LeaderboardTable
              members={board.members}
              currentUid={profile.uid}
              winnerUid={board.winnerUid}
              lastPlaceUid={board.lastPlaceUid}
              compact
            />
          )}
        </section>
      </main>
    </div>
  );
}
