import { NextRequest } from "next/server";
import { requireAdmin, jsonError, AuthError } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase/admin";
import { calculateDinnerContributions } from "@/lib/scoring";
import { computeLeaderboard, writeAudit, ensureMonth } from "@/lib/leaderboard";
import { currentMonth } from "@/lib/dates";
import type { DinnerEvent, DinnerParticipant } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const month = req.nextUrl.searchParams.get("month") || currentMonth();
    const db = adminDb();
    const eventSnap = await db.collection("dinnerEvents").doc(month).get();
    const partsSnap = await db
      .collection("dinnerEvents")
      .doc(month)
      .collection("participants")
      .get();
    return Response.json({
      event: eventSnap.exists ? eventSnap.data() : null,
      participants: partsSnap.docs.map((d) => d.data()),
    });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json();
    const month = (body.month as string) || currentMonth();
    const totalBill = Number(body.totalBill);
    const participantUids = (body.participantUids as string[]) || [];

    if (!Number.isFinite(totalBill) || totalBill < 0) {
      throw new AuthError("Invalid bill amount", 400);
    }

    const challenge = await ensureMonth(month);
    const board = await computeLeaderboard(month);
    const winnerUid = challenge.winnerUid || board.winnerUid;
    const lastPlaceUid = challenge.lastPlaceUid || board.lastPlaceUid;

    if (!winnerUid || !lastPlaceUid) {
      throw new AuthError("Winner and last place must be determined first", 400);
    }
    if (winnerUid === lastPlaceUid) {
      throw new AuthError("Winner and last place cannot be the same", 400);
    }

    // Ensure winner is never charged
    const participants = Array.from(
      new Set([...participantUids, lastPlaceUid].filter((u) => u !== winnerUid))
    );
    // Always include last place
    if (!participants.includes(lastPlaceUid)) participants.push(lastPlaceUid);

    const contributions = calculateDinnerContributions(
      totalBill,
      winnerUid,
      lastPlaceUid,
      [...participants, winnerUid]
    );

    const db = adminDb();
    const event: DinnerEvent = {
      month,
      winnerUid,
      lastPlaceUid,
      totalBill,
      status: "finalized",
      createdAt: new Date().toISOString(),
    };
    await db.collection("dinnerEvents").doc(month).set(event);

    const batch = db.batch();
    // Clear old participants
    const old = await db
      .collection("dinnerEvents")
      .doc(month)
      .collection("participants")
      .get();
    old.docs.forEach((d) => batch.delete(d.ref));

    const allUids = Array.from(new Set([winnerUid, ...participants]));
    for (const uid of allUids) {
      const p: DinnerParticipant = {
        uid,
        participating: uid === winnerUid || participants.includes(uid),
        contribution: contributions.get(uid) ?? 0,
      };
      batch.set(
        db.collection("dinnerEvents").doc(month).collection("participants").doc(uid),
        p
      );
    }
    await batch.commit();

    await writeAudit(admin.uid, "dinner_bill_entered", month, {
      totalBill,
      winnerUid,
      lastPlaceUid,
      contributions: Object.fromEntries(contributions),
    });

    return Response.json({
      event,
      contributions: Object.fromEntries(contributions),
    });
  } catch (e) {
    return jsonError(e);
  }
}
