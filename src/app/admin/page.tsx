"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, apiFetch } from "@/lib/auth-context";
import { Navbar } from "@/components/Navbar";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { LoadingScreen, StatCard } from "@/components/ui";
import { formatStrikeRate } from "@/lib/scoring";
import type { AppUser, LeaderboardResult } from "@/lib/types";

type Tab =
  | "overview"
  | "approvals"
  | "members"
  | "eligibility"
  | "leaderboard"
  | "results"
  | "corrections"
  | "dinner"
  | "audit"
  | "settings";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "approvals", label: "Approvals" },
  { id: "members", label: "Members" },
  { id: "eligibility", label: "Eligibility" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "results", label: "Results" },
  { id: "corrections", label: "Corrections" },
  { id: "dinner", label: "Dinner" },
  { id: "audit", label: "Audit" },
  { id: "settings", label: "Settings" },
];

export default function AdminPage() {
  const { user, profile, loading, getIdToken, configured } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [board, setBoard] = useState<LeaderboardResult | null>(null);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [members, setMembers] = useState<AppUser[]>([]);
  const [eligibility, setEligibility] = useState<any[]>([]);
  const [corrections, setCorrections] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [dinner, setDinner] = useState<any>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // forms
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPass, setNewPass] = useState("");
  const [eligUid, setEligUid] = useState("");
  const [eligDays, setEligDays] = useState(20);
  const [bill, setBill] = useState(5000);
  const [participants, setParticipants] = useState<string[]>([]);
  const [bottleMl, setBottleMl] = useState(1000);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});

  const token = useCallback(async () => {
    const t = await getIdToken();
    if (!t) throw new Error("Not authenticated");
    return t;
  }, [getIdToken]);

  const refresh = useCallback(async () => {
    const t = await token();
    const [lb, ap, mem, el, corr, au, din] = await Promise.all([
      apiFetch("/api/leaderboard", t),
      apiFetch("/api/admin/approvals?status=pending", t),
      apiFetch("/api/admin/members", t),
      apiFetch("/api/admin/eligibility", t),
      apiFetch("/api/corrections?status=pending", t),
      apiFetch("/api/admin/audit", t),
      apiFetch("/api/admin/dinner", t),
    ]);
    setBoard(lb);
    setApprovals(ap.items || []);
    setMembers(mem.members || []);
    setEligibility(el.items || []);
    setCorrections(corr.items || []);
    setAudit(au.items || []);
    setDinner(din);
    setBottleMl(lb.bottleSizeMl);
    if (participants.length === 0) {
      setParticipants(
        (lb.members as any[])
          .filter((m: any) => m.uid !== lb.winnerUid)
          .map((m: any) => m.uid)
      );
    }
  }, [token, participants.length]);

  useEffect(() => {
    if (loading) return;
    if (!configured) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (profile && profile.role !== "admin") {
      router.replace("/member");
      return;
    }
    if (profile?.role === "admin") {
      refresh().catch((e) => setError(e.message));
    }
  }, [user, profile, loading, configured, router, refresh]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMsg("");
    try {
      await fn();
      setMsg("Done");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !profile) return <LoadingScreen />;
  if (profile.role !== "admin") return <LoadingScreen message="Redirecting…" />;

  const leader = board?.members.find((m) => m.rank === 1);
  const last = board?.members
    .filter((m) => m.isEligible)
    .slice()
    .reverse()[0];

  return (
    <div className="min-h-screen pb-20">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="font-display text-2xl font-bold text-cyan-950">Admin Dashboard</h1>
        <p className="text-sm text-cyan-800/60">
          {board?.month} · {board?.status === "closed" ? "🔒 Closed" : "🟢 Open"}
        </p>

        {(error || msg) && (
          <p className={`mt-3 text-sm ${error ? "text-rose-700" : "text-emerald-700"}`}>
            {error || msg}
          </p>
        )}

        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                tab === t.id
                  ? "bg-cyan-800 text-white"
                  : "bg-white/70 text-cyan-900 border border-cyan-900/10"
              }`}
            >
              {t.label}
              {t.id === "approvals" && approvals.length > 0 ? ` (${approvals.length})` : ""}
            </button>
          ))}
        </div>

        {tab === "overview" && board && (
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
            <StatCard label="Pending approvals" value={approvals.length} accent="amber" />
            <StatCard
              label="Current leader"
              value={leader?.name || "—"}
              hint={leader ? formatStrikeRate(leader.strikeRate) : undefined}
            />
            <StatCard
              label="Last place (preview)"
              value={last?.name || "—"}
              hint={last ? formatStrikeRate(last.strikeRate) : undefined}
              accent="rose"
            />
            <StatCard label="Eligible members" value={board.eligibleCount} />
            <StatCard label="Total bottles" value={board.totalBottles} />
            <StatCard label="Approved submissions" value={board.approvedSubmissions} />
          </div>
        )}

        {tab === "approvals" && (
          <div className="mt-4 space-y-3">
            {approvals.length === 0 && (
              <p className="text-sm text-cyan-800/60">No pending approvals</p>
            )}
            {approvals.map((a) => (
              <div key={a.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-cyan-950">
                      {a.memberName} · {a.date}
                    </p>
                    <p className="text-sm text-cyan-800/70">
                      {a.bottles} bottles · Pending
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      className="btn-primary py-2 text-sm"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          const t = await token();
                          await apiFetch("/api/admin/approvals", t, {
                            method: "POST",
                            body: JSON.stringify({
                              submissionId: a.id,
                              action: "approve",
                            }),
                          });
                        })
                      }
                    >
                      Approve
                    </button>
                    <div className="flex gap-2">
                      <input
                        className="input py-2 text-sm"
                        placeholder="Rejection reason"
                        value={rejectReasons[a.id] || ""}
                        onChange={(e) =>
                          setRejectReasons((r) => ({ ...r, [a.id]: e.target.value }))
                        }
                      />
                      <button
                        className="btn-danger text-sm"
                        disabled={busy}
                        onClick={() =>
                          run(async () => {
                            const t = await token();
                            await apiFetch("/api/admin/approvals", t, {
                              method: "POST",
                              body: JSON.stringify({
                                submissionId: a.id,
                                action: "reject",
                                rejectionReason: rejectReasons[a.id],
                              }),
                            });
                          })
                        }
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "members" && (
          <div className="mt-4 space-y-4">
            <form
              className="card grid gap-3 p-4 sm:grid-cols-4"
              onSubmit={(e) => {
                e.preventDefault();
                run(async () => {
                  const t = await token();
                  await apiFetch("/api/admin/members", t, {
                    method: "POST",
                    body: JSON.stringify({
                      action: "create",
                      name: newName,
                      email: newEmail,
                      password: newPass,
                    }),
                  });
                  setNewName("");
                  setNewEmail("");
                  setNewPass("");
                });
              }}
            >
              <input
                className="input"
                placeholder="Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
              <input
                className="input"
                placeholder="Email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
              <input
                className="input"
                placeholder="Temp password"
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                required
                minLength={6}
              />
              <button className="btn-primary" disabled={busy}>
                Add member
              </button>
            </form>
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.uid} className="card flex items-center justify-between gap-3 p-3">
                  <div>
                    <p className="font-medium">
                      {m.name}{" "}
                      <span className="text-xs uppercase text-cyan-700/60">{m.role}</span>
                      {!m.active && (
                        <span className="ml-2 text-xs text-rose-600">inactive</span>
                      )}
                    </p>
                    <p className="text-xs text-cyan-800/50">{m.email}</p>
                  </div>
                  <button
                    className="rounded-lg border border-cyan-900/15 px-3 py-1.5 text-xs font-semibold"
                    disabled={busy || m.role === "admin"}
                    onClick={() =>
                      run(async () => {
                        const t = await token();
                        await apiFetch("/api/admin/members", t, {
                          method: "POST",
                          body: JSON.stringify({
                            action: m.active ? "deactivate" : "reactivate",
                            uid: m.uid,
                          }),
                        });
                      })
                    }
                  >
                    {m.active ? "Deactivate" : "Reactivate"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "eligibility" && (
          <div className="mt-4 space-y-4">
            <div className="card grid gap-3 p-4 sm:grid-cols-3">
              <select
                className="input"
                value={eligUid}
                onChange={(e) => setEligUid(e.target.value)}
              >
                <option value="">Select member</option>
                {members
                  .filter((m) => m.active)
                  .map((m) => (
                    <option key={m.uid} value={m.uid}>
                      {m.name}
                    </option>
                  ))}
              </select>
              <input
                className="input"
                type="number"
                min={0}
                max={31}
                value={eligDays}
                onChange={(e) => setEligDays(Number(e.target.value))}
              />
              <button
                className="btn-primary"
                disabled={busy || !eligUid}
                onClick={() =>
                  run(async () => {
                    const t = await token();
                    await apiFetch("/api/admin/eligibility", t, {
                      method: "POST",
                      body: JSON.stringify({ uid: eligUid, eligibleDays: eligDays }),
                    });
                  })
                }
              >
                Set eligible days
              </button>
            </div>
            <p className="text-xs text-cyan-800/50">
              ≥15 eligible days required for Winner / Last Place ranking.
            </p>
            <ul className="space-y-2">
              {eligibility.map((e) => {
                const name = members.find((m) => m.uid === e.uid)?.name || e.uid;
                return (
                  <li key={e.id || `${e.month}_${e.uid}`} className="card p-3 text-sm">
                    <span className="font-medium">{name}</span>: {e.eligibleDays} days (
                    {e.startDate} → {e.endDate})
                    {e.eligibleDays < 15 && (
                      <span className="ml-2 text-amber-700">Not eligible for ranking</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {tab === "leaderboard" && board && (
          <div className="mt-4">
            <LeaderboardTable
              members={board.members}
              winnerUid={board.winnerUid}
              lastPlaceUid={board.lastPlaceUid}
            />
          </div>
        )}

        {tab === "results" && board && (
          <div className="mt-4 space-y-4">
            <div className="card space-y-2 p-4">
              <p>
                Winner:{" "}
                <strong>
                  {board.members.find((m) => m.uid === board.winnerUid)?.name || "TBD"}
                </strong>
              </p>
              <p>
                Last place:{" "}
                <strong>
                  {board.members.find((m) => m.uid === board.lastPlaceUid)?.name || "TBD"}
                </strong>
              </p>
              {board.tieNeedsResolution && (
                <p className="text-amber-700">Tie needs admin resolution</p>
              )}
              <p className="text-sm text-cyan-800/60">Status: {board.status}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {board.status === "open" ? (
                <button
                  className="btn-primary"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const t = await token();
                      await apiFetch("/api/admin/month", t, {
                        method: "POST",
                        body: JSON.stringify({ action: "close" }),
                      });
                    })
                  }
                >
                  Close month & freeze results
                </button>
              ) : (
                <button
                  className="rounded-xl border border-cyan-800/20 bg-white px-4 py-3 font-semibold"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const t = await token();
                      await apiFetch("/api/admin/month", t, {
                        method: "POST",
                        body: JSON.stringify({ action: "reopen" }),
                      });
                    })
                  }
                >
                  Reopen month
                </button>
              )}
            </div>
          </div>
        )}

        {tab === "corrections" && (
          <div className="mt-4 space-y-3">
            {corrections.length === 0 && (
              <p className="text-sm text-cyan-800/60">No pending corrections</p>
            )}
            {corrections.map((c) => (
              <div key={c.id} className="card p-4">
                <p className="font-medium">
                  {members.find((m) => m.uid === c.uid)?.name || c.uid}
                </p>
                <p className="text-sm">
                  {c.oldBottles} → {c.requestedBottles} bottles
                </p>
                <p className="text-sm text-cyan-800/60">{c.reason}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    className="btn-primary py-2 text-sm"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        const t = await token();
                        await apiFetch("/api/corrections", t, {
                          method: "POST",
                          body: JSON.stringify({
                            action: "review",
                            correctionId: c.id,
                            decision: "approve",
                          }),
                        });
                      })
                    }
                  >
                    Approve
                  </button>
                  <button
                    className="btn-danger text-sm"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        const t = await token();
                        await apiFetch("/api/corrections", t, {
                          method: "POST",
                          body: JSON.stringify({
                            action: "review",
                            correctionId: c.id,
                            decision: "reject",
                          }),
                        });
                      })
                    }
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "dinner" && board && (
          <div className="mt-4 space-y-4">
            <div className="card space-y-3 p-4">
              <p className="text-sm text-cyan-800/70">
                Winner pays ₹0 · Last place pays 50% · Rest split equally among other participants
              </p>
              <label className="text-sm font-medium">
                Total dinner bill (₹)
                <input
                  className="input mt-1"
                  type="number"
                  min={0}
                  value={bill}
                  onChange={(e) => setBill(Number(e.target.value))}
                />
              </label>
              <div>
                <p className="mb-2 text-sm font-medium">Participants (non-winner)</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {board.members
                    .filter((m) => m.uid !== board.winnerUid)
                    .map((m) => (
                      <label key={m.uid} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={participants.includes(m.uid)}
                          onChange={(e) => {
                            setParticipants((p) =>
                              e.target.checked
                                ? [...p, m.uid]
                                : p.filter((id) => id !== m.uid)
                            );
                          }}
                        />
                        {m.name}
                        {m.uid === board.lastPlaceUid ? " (last place)" : ""}
                      </label>
                    ))}
                </div>
              </div>
              <button
                className="btn-primary"
                disabled={busy || !board.winnerUid || !board.lastPlaceUid}
                onClick={() =>
                  run(async () => {
                    const t = await token();
                    await apiFetch("/api/admin/dinner", t, {
                      method: "POST",
                      body: JSON.stringify({
                        totalBill: bill,
                        participantUids: participants,
                      }),
                    });
                  })
                }
              >
                Calculate & save dinner
              </button>
            </div>
            {dinner?.event && (
              <div className="card p-4 text-sm">
                <p className="font-semibold">Saved: ₹{dinner.event.totalBill}</p>
                <ul className="mt-2 space-y-1">
                  {(dinner.participants || []).map((p: any) => (
                    <li key={p.uid}>
                      {members.find((m) => m.uid === p.uid)?.name || p.uid}: ₹
                      {Number(p.contribution).toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {tab === "audit" && (
          <div className="mt-4 max-h-[70vh] space-y-2 overflow-y-auto">
            {audit.map((a) => (
              <div key={a.id} className="card p-3 text-xs">
                <p className="font-semibold text-cyan-950">
                  {a.action} · {a.targetId}
                </p>
                <p className="text-cyan-800/50">
                  {a.createdAt} · actor {a.actorUid}
                </p>
                <pre className="mt-1 overflow-x-auto text-[10px] text-cyan-900/60">
                  {JSON.stringify(a.details || {}, null, 0)}
                </pre>
              </div>
            ))}
          </div>
        )}

        {tab === "settings" && (
          <div className="mt-4 card space-y-3 p-4">
            <label className="text-sm font-medium">
              Bottle size (ml)
              <input
                className="input mt-1"
                type="number"
                min={100}
                value={bottleMl}
                onChange={(e) => setBottleMl(Number(e.target.value))}
              />
            </label>
            <button
              className="btn-primary"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const t = await token();
                  await apiFetch("/api/admin/month", t, {
                    method: "POST",
                    body: JSON.stringify({
                      action: "settings",
                      bottleSizeMl: bottleMl,
                    }),
                  });
                })
              }
            >
              Save settings
            </button>
            <p className="text-xs text-cyan-800/50">
              Admin identity is controlled by ADMIN_EMAIL / ADMIN_UID env vars — not by client role
              edits.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
