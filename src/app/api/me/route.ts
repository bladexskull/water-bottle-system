import { NextRequest } from "next/server";
import { verifyRequestUser, jsonError } from "@/lib/auth-server";
import { ensureMonth } from "@/lib/leaderboard";
import { adminDb } from "@/lib/firebase/admin";
import { currentMonth } from "@/lib/dates";

async function handleMe(req: NextRequest) {
  const user = await verifyRequestUser(req, { allowPending: true });

  let nameFromBody: string | undefined;
  if (req.method === "POST") {
    try {
      const body = await req.json();
      if (typeof body?.name === "string" && body.name.trim()) {
        nameFromBody = body.name.trim().slice(0, 80);
      }
    } catch {
      // empty body is fine
    }
  }

  if (nameFromBody && nameFromBody !== user.name) {
    await adminDb().collection("users").doc(user.uid).update({ name: nameFromBody });
    user.name = nameFromBody;
  }

  if (user.active && user.approvalStatus === "approved") {
    await ensureMonth(currentMonth());
  }

  return Response.json({ user });
}

export async function GET(req: NextRequest) {
  try {
    return await handleMe(req);
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    return await handleMe(req);
  } catch (e) {
    return jsonError(e);
  }
}
