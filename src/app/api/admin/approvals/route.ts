import { NextRequest } from "next/server";
import { requireAdmin, jsonError, AuthError } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase/admin";
import { calculateBasePoints } from "@/lib/scoring";
import { writeAudit, ensureMonth } from "@/lib/leaderboard";
import { currentMonth } from "@/lib/dates";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const month = req.nextUrl.searchParams.get("month") || currentMonth();
    const status = req.nextUrl.searchParams.get("status") || "pending";
    const db = adminDb();
    let q = db.collection("dailySubmissions").where("month", "==", month);
    if (status !== "all") {
      q = q.where("status", "==", status);
    }
    const snap = await q.get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<
      Record<string, unknown> & { id: string }
    >;
    items.sort((a, b) =>
      String(b.submittedAt ?? "").localeCompare(String(a.submittedAt ?? ""))
    );

    const usersSnap = await db.collection("users").get();
    const names: Record<string, string> = {};
    usersSnap.docs.forEach((d) => {
      names[d.id] = (d.data().name as string) || "Member";
    });

    return Response.json({
      items: items.map((i) => ({
        ...i,
        memberName: names[String(i.uid)] || "Member",
      })),
    });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json();
    const { submissionId, action, rejectionReason } = body as {
      submissionId: string;
      action: "approve" | "reject";
      rejectionReason?: string;
    };

    if (!submissionId || !["approve", "reject"].includes(action)) {
      throw new AuthError("Invalid request", 400);
    }

    const db = adminDb();
    const ref = db.collection("dailySubmissions").doc(submissionId);
    const snap = await ref.get();
    if (!snap.exists) throw new AuthError("Submission not found", 404);
    const data = snap.data()!;

    const challenge = await ensureMonth(data.month);
    if (challenge.status === "closed") {
      throw new AuthError("Month is locked", 403);
    }

    if (data.status !== "pending") {
      throw new AuthError("Submission already reviewed", 400);
    }

    if (action === "reject") {
      if (!rejectionReason?.trim()) {
        throw new AuthError("Rejection reason required", 400);
      }
      await ref.update({
        status: "rejected",
        basePoints: 0,
        reviewedAt: new Date().toISOString(),
        reviewedBy: admin.uid,
        rejectionReason: rejectionReason.trim(),
      });
      await writeAudit(admin.uid, "submission_rejected", submissionId, {
        reason: rejectionReason.trim(),
        bottles: data.bottles,
      });
      return Response.json({ ok: true, status: "rejected" });
    }

    const basePoints = calculateBasePoints(Number(data.bottles));
    await ref.update({
      status: "approved",
      basePoints,
      reviewedAt: new Date().toISOString(),
      reviewedBy: admin.uid,
      rejectionReason: null,
    });
    await writeAudit(admin.uid, "submission_approved", submissionId, {
      bottles: data.bottles,
      basePoints,
    });
    return Response.json({ ok: true, status: "approved", basePoints });
  } catch (e) {
    return jsonError(e);
  }
}
