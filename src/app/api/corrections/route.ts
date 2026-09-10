import { NextRequest } from "next/server";
import { verifyRequestUser, requireAdmin, jsonError, AuthError } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase/admin";
import { calculateBasePoints } from "@/lib/scoring";
import { writeAudit, ensureMonth } from "@/lib/leaderboard";
import { currentMonth } from "@/lib/dates";

export async function GET(req: NextRequest) {
  try {
    const user = await verifyRequestUser(req);
    const db = adminDb();
    if (user.role === "admin") {
      const status = req.nextUrl.searchParams.get("status") || "pending";
      const snap = await db
        .collection("correctionRequests")
        .orderBy("createdAt", "desc")
        .limit(100)
        .get();
      let items = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<
        Record<string, unknown> & { id: string }
      >;
      if (status !== "all") items = items.filter((i) => i.status === status);
      return Response.json({ items });
    }
    const snap = await db
      .collection("correctionRequests")
      .where("uid", "==", user.uid)
      .get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<
      Record<string, unknown> & { id: string }
    >;
    items.sort((a, b) =>
      String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""))
    );
    return Response.json({ items });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifyRequestUser(req);
    const body = await req.json();

    if (body.action === "request") {
      const { submissionId, requestedBottles, reason } = body;
      if (!submissionId || !reason?.trim()) {
        throw new AuthError("submissionId and reason required", 400);
      }
      const bottles = Number(requestedBottles);
      if (!Number.isInteger(bottles) || bottles < 0 || bottles > 50) {
        throw new AuthError("Invalid requested bottles", 400);
      }

      const db = adminDb();
      const subRef = db.collection("dailySubmissions").doc(submissionId);
      const subSnap = await subRef.get();
      if (!subSnap.exists) throw new AuthError("Submission not found", 404);
      const sub = subSnap.data()!;
      if (sub.uid !== user.uid) throw new AuthError("Not your submission", 403);
      if (sub.status !== "approved") {
        throw new AuthError("Only approved submissions can be corrected", 400);
      }

      const challenge = await ensureMonth(sub.month);
      if (challenge.status === "closed") {
        throw new AuthError("Month is locked", 403);
      }

      const ref = await db.collection("correctionRequests").add({
        submissionId,
        uid: user.uid,
        oldBottles: sub.bottles,
        requestedBottles: bottles,
        reason: reason.trim(),
        status: "pending",
        createdAt: new Date().toISOString(),
        reviewedAt: null,
        reviewedBy: null,
      });
      await writeAudit(user.uid, "correction_requested", ref.id, {
        submissionId,
        oldBottles: sub.bottles,
        requestedBottles: bottles,
        reason: reason.trim(),
      });
      return Response.json({ id: ref.id });
    }

    if (body.action === "review") {
      const admin = await requireAdmin(req);
      const { correctionId, decision } = body as {
        correctionId: string;
        decision: "approve" | "reject";
      };
      if (!correctionId || !["approve", "reject"].includes(decision)) {
        throw new AuthError("Invalid review", 400);
      }

      const db = adminDb();
      const cref = db.collection("correctionRequests").doc(correctionId);
      const csnap = await cref.get();
      if (!csnap.exists) throw new AuthError("Not found", 404);
      const corr = csnap.data()!;
      if (corr.status !== "pending") throw new AuthError("Already reviewed", 400);

      if (decision === "reject") {
        await cref.update({
          status: "rejected",
          reviewedAt: new Date().toISOString(),
          reviewedBy: admin.uid,
        });
        await writeAudit(admin.uid, "correction_rejected", correctionId, {});
        return Response.json({ ok: true });
      }

      const subRef = db.collection("dailySubmissions").doc(corr.submissionId);
      const subSnap = await subRef.get();
      if (!subSnap.exists) throw new AuthError("Submission missing", 404);
      const sub = subSnap.data()!;
      const challenge = await ensureMonth(sub.month);
      if (challenge.status === "closed") throw new AuthError("Month locked", 403);

      const newPoints = calculateBasePoints(Number(corr.requestedBottles));
      await subRef.update({
        bottles: corr.requestedBottles,
        basePoints: newPoints,
      });
      await cref.update({
        status: "approved",
        reviewedAt: new Date().toISOString(),
        reviewedBy: admin.uid,
      });
      await writeAudit(admin.uid, "correction_approved", correctionId, {
        submissionId: corr.submissionId,
        oldBottles: corr.oldBottles,
        newBottles: corr.requestedBottles,
        oldBasePoints: sub.basePoints,
        newBasePoints: newPoints,
      });
      return Response.json({ ok: true, basePoints: newPoints });
    }

    throw new AuthError("Unknown action", 400);
  } catch (e) {
    return jsonError(e);
  }
}
