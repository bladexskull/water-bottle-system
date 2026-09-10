import { NextRequest } from "next/server";
import { jsonError, verifyRequestUser } from "@/lib/auth-server";
import { computeLeaderboard, ensureMonth } from "@/lib/leaderboard";
import { currentMonth } from "@/lib/dates";

export async function GET(req: NextRequest) {
  try {
    await verifyRequestUser(req);
    const month = req.nextUrl.searchParams.get("month") || currentMonth();
    await ensureMonth(month);
    const board = await computeLeaderboard(month);
    return Response.json(board);
  } catch (e) {
    return jsonError(e);
  }
}
