import { NextRequest } from "next/server";
import { verifyRequestUser, jsonError, AuthError } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase/admin";
import { calculateBasePoints } from "@/lib/scoring";
import { ensureMonth, writeAudit } from "@/lib/leaderboard";
import { currentMonth, isFutureDate, todayISO, monthFromDate } from "@/lib/dates";

export async function POST(req: NextRequest) {
  try {
    const user = await verifyRequestUser(req);
    const body = await req.json();
    const bottles = Number(body.bottles);
    const note = typeof body.note === "string" ? body.note.slice(0, 200) : "";
    const date = typeof body.date === "string" ? body.date : todayISO();

    if (!Number.isInteger(bottles) || bottles < 0 || bottles > 50) {
      throw new AuthError("Bottles must be an integer between 0 and 50", 400);
    }
    if (isFutureDate(date)) {
      throw new AuthError("Future dates are not allowed", 400);
    }
    if (date !== todayISO()) {
      throw new AuthError("Only today's submission is allowed via normal UI", 400);
    }

    const month = monthFromDate(date);
    const challenge = await ensureMonth(month);
    if (challenge.status === "closed") {
      throw new AuthError("Month is locked. Submissions disabled.", 403);
    }

    const id = `${date}_${user.uid}`;
    const db = adminDb();
    const ref = db.collection("dailySubmissions").doc(id);
    const existing = await ref.get();
    if (existing.exists) {
      throw new AuthError("You already submitted for this date", 409);
    }

    // Server calculates points; stored but only counts when approved
    const basePoints = calculateBasePoints(bottles);
    const doc = {
      uid: user.uid,
      date,
      month,
      bottles,
      basePoints,
      status: "pending",
      note,
      submittedAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: null,
    };
    await ref.create(doc);
    await writeAudit(user.uid, "submission_created", id, { bottles, date });

    return Response.json({ id, ...doc });
  } catch (e) {
    return jsonError(e);
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await verifyRequestUser(req);
    const month = req.nextUrl.searchParams.get("month") || currentMonth();
    const db = adminDb();
    const snap = await db
      .collection("dailySubmissions")
      .where("uid", "==", user.uid)
      .where("month", "==", month)
      .get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<
      Record<string, unknown> & { id: string }
    >;
    const today = items.find((i) => i.date === todayISO()) || null;
    return Response.json({ items, today });
  } catch (e) {
    return jsonError(e);
  }
}
