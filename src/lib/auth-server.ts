import { NextRequest } from "next/server";
import { adminAuth, adminDb, isConfiguredAdmin } from "./firebase/admin";
import type { AppUser, Role } from "./types";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export async function verifyRequestUser(req: NextRequest): Promise<AppUser> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new AuthError("Missing auth token");

  const decoded = await adminAuth().verifyIdToken(token);
  const db = adminDb();
  const ref = db.collection("users").doc(decoded.uid);
  const snap = await ref.get();

  if (!snap.exists) {
    const email = decoded.email || "";
    const role: Role = isConfiguredAdmin(decoded.uid, email) ? "admin" : "member";
    const user: AppUser = {
      uid: decoded.uid,
      name: decoded.name || email.split("@")[0] || "Member",
      email,
      role,
      active: true,
      createdAt: new Date().toISOString(),
    };
    await ref.set(user);
    return user;
  }

  const user = snap.data() as AppUser;

  // Keep role in sync with env-configured admin (server-side only)
  if (isConfiguredAdmin(user.uid, user.email) && user.role !== "admin") {
    await ref.update({ role: "admin" });
    user.role = "admin";
  }

  if (!user.active) throw new AuthError("Account deactivated", 403);
  return user;
}

export async function requireAdmin(req: NextRequest): Promise<AppUser> {
  const user = await verifyRequestUser(req);
  if (user.role !== "admin") throw new AuthError("Admin only", 403);
  return user;
}

export function jsonError(err: unknown) {
  if (err instanceof AuthError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  const message = err instanceof Error ? err.message : "Server error";
  return Response.json({ error: message }, { status: 500 });
}
