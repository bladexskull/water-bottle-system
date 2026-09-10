import { NextRequest } from "next/server";
import { verifyRequestUser, jsonError } from "@/lib/auth-server";
import { ensureMonth } from "@/lib/leaderboard";
import { currentMonth } from "@/lib/dates";

export async function GET(req: NextRequest) {
  try {
    const user = await verifyRequestUser(req);
    await ensureMonth(currentMonth());
    return Response.json({ user });
  } catch (e) {
    return jsonError(e);
  }
}
