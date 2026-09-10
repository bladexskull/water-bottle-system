import { NextRequest } from "next/server";
import { requireAdmin, jsonError, AuthError } from "@/lib/auth-server";
import { freezeMonthResults, reopenMonth, ensureMonth, writeAudit } from "@/lib/leaderboard";
import { adminDb } from "@/lib/firebase/admin";
import { currentMonth } from "@/lib/dates";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const month = req.nextUrl.searchParams.get("month") || currentMonth();
    const challenge = await ensureMonth(month);
    return Response.json({ challenge });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json();
    const month = (body.month as string) || currentMonth();
    const action = body.action as string;

    if (action === "close") {
      const board = await freezeMonthResults(month, admin.uid);
      return Response.json({ ok: true, board });
    }
    if (action === "reopen") {
      await reopenMonth(month, admin.uid);
      return Response.json({ ok: true });
    }
    if (action === "resolve_tie") {
      const { winnerUid, lastPlaceUid } = body;
      if (!winnerUid || !lastPlaceUid) {
        throw new AuthError("winnerUid and lastPlaceUid required", 400);
      }
      await adminDb().collection("monthlyChallenges").doc(month).update({
        winnerUid,
        lastPlaceUid,
        tieNeedsResolution: false,
      });
      await writeAudit(admin.uid, "winner_finalized", month, {
        winnerUid,
        lastPlaceUid,
      });
      return Response.json({ ok: true });
    }
    if (action === "settings") {
      const updates: Record<string, unknown> = {};
      if (typeof body.bottleSizeMl === "number") updates.bottleSizeMl = body.bottleSizeMl;
      if (typeof body.minimumEligibleDays === "number") {
        updates.minimumEligibleDays = body.minimumEligibleDays;
      }
      await ensureMonth(month);
      await adminDb().collection("monthlyChallenges").doc(month).update(updates);
      await writeAudit(admin.uid, "settings_updated", month, updates);
      return Response.json({ ok: true });
    }

    throw new AuthError("Unknown action", 400);
  } catch (e) {
    return jsonError(e);
  }
}
