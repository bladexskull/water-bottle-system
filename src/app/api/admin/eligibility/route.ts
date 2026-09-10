import { NextRequest } from "next/server";
import { requireAdmin, jsonError, AuthError } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase/admin";
import { writeAudit, ensureMonth } from "@/lib/leaderboard";
import { currentMonth, monthBounds } from "@/lib/dates";
import type { EligibleDaysDoc } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const month = req.nextUrl.searchParams.get("month") || currentMonth();
    const snap = await adminDb()
      .collection("eligibleDays")
      .where("month", "==", month)
      .get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return Response.json({ items });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json();
    const month = (body.month as string) || currentMonth();
    const uid = body.uid as string;
    const eligibleDays = Number(body.eligibleDays);
    const bounds = monthBounds(month);
    const startDate = (body.startDate as string) || bounds.start;
    const endDate = (body.endDate as string) || bounds.end;

    if (!uid) throw new AuthError("uid required", 400);
    if (!Number.isInteger(eligibleDays) || eligibleDays < 0 || eligibleDays > 31) {
      throw new AuthError("eligibleDays must be 0-31", 400);
    }

    await ensureMonth(month);
    const id = `${month}_${uid}`;
    const doc: EligibleDaysDoc = {
      uid,
      month,
      eligibleDays,
      startDate,
      endDate,
      updatedAt: new Date().toISOString(),
    };
    await adminDb().collection("eligibleDays").doc(id).set(doc);
    await writeAudit(admin.uid, "eligibility_changed", id, {
      eligibleDays,
      startDate,
      endDate,
    });
    return Response.json({ ok: true, doc });
  } catch (e) {
    return jsonError(e);
  }
}
