import { NextRequest } from "next/server";
import { requireAdmin, jsonError, AuthError } from "@/lib/auth-server";
import { adminAuth, adminDb, isConfiguredAdmin } from "@/lib/firebase/admin";
import { writeAudit } from "@/lib/leaderboard";
import type { AppUser } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const snap = await adminDb().collection("users").orderBy("createdAt", "asc").get();
    const members = snap.docs.map((d) => d.data() as AppUser);
    return Response.json({ members });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json();
    const action = body.action as string;

    if (action === "create") {
      const { name, email, password } = body;
      if (!name || !email || !password || password.length < 6) {
        throw new AuthError("Name, email, and password (6+) required", 400);
      }
      const role = isConfiguredAdmin("pending", email) ? "admin" : "member";
      // Ensure only one admin: configured admin email only
      const userRecord = await adminAuth().createUser({
        email,
        password,
        displayName: name,
      });
      const user: AppUser = {
        uid: userRecord.uid,
        name,
        email: email.toLowerCase(),
        role: isConfiguredAdmin(userRecord.uid, email) ? "admin" : "member",
        active: true,
        createdAt: new Date().toISOString(),
      };
      void role;
      await adminDb().collection("users").doc(user.uid).set(user);
      await writeAudit(admin.uid, "member_created", user.uid, { email, name });
      return Response.json({ user });
    }

    if (action === "deactivate" || action === "reactivate") {
      const uid = body.uid as string;
      if (!uid) throw new AuthError("uid required", 400);
      const active = action === "reactivate";
      await adminDb().collection("users").doc(uid).update({ active });
      await writeAudit(
        admin.uid,
        active ? "member_reactivated" : "member_deactivated",
        uid,
        {}
      );
      return Response.json({ ok: true, active });
    }

    throw new AuthError("Unknown action", 400);
  } catch (e) {
    return jsonError(e);
  }
}
