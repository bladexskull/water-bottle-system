import { NextRequest } from "next/server";
import { requireAdmin, jsonError } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase/admin";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") || 100), 200);
    const snap = await adminDb()
      .collection("auditLogs")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return Response.json({ items });
  } catch (e) {
    return jsonError(e);
  }
}
