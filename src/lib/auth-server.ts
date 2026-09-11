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

type VerifyOptions = {
  /** Allow pending/rejected users (for /api/me + waiting UI only) */
  allowPending?: boolean;
};

function ensureAdminPrivileges(user: AppUser): AppUser {
  if (!isConfiguredAdmin(user.uid, user.email)) return user;
  return {
    ...user,
    role: "admin",
    active: true,
    approvalStatus: "approved",
  };
}

export async function verifyRequestUser(
  req: NextRequest,
  options: VerifyOptions = {}
): Promise<AppUser> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new AuthError("Missing auth token");

  const decoded = await adminAuth().verifyIdToken(token);
  const db = adminDb();
  const ref = db.collection("users").doc(decoded.uid);
  const snap = await ref.get();

  if (!snap.exists) {
    const email = decoded.email || "";
    const isAdmin = isConfiguredAdmin(decoded.uid, email);
    const user: AppUser = {
      uid: decoded.uid,
      name: decoded.name || email.split("@")[0] || "Member",
      email,
      role: isAdmin ? "admin" : "member",
      active: isAdmin,
      approvalStatus: isAdmin ? "approved" : "pending",
      createdAt: new Date().toISOString(),
    };
    await ref.set(user);
    if (!options.allowPending && !user.active) {
      throw new AuthError("Waiting for admin approval", 403);
    }
    return user;
  }

  let user = snap.data() as AppUser;
  // Backfill older docs without approvalStatus
  if (!user.approvalStatus) {
    user.approvalStatus = user.active ? "approved" : "pending";
  }

  const upgraded = ensureAdminPrivileges(user);
  if (
    upgraded.role !== user.role ||
    upgraded.active !== user.active ||
    upgraded.approvalStatus !== user.approvalStatus
  ) {
    await ref.update({
      role: upgraded.role,
      active: upgraded.active,
      approvalStatus: upgraded.approvalStatus,
    });
    user = upgraded;
  }

  if (!options.allowPending) {
    if (user.approvalStatus === "pending") {
      throw new AuthError("Waiting for admin approval", 403);
    }
    if (user.approvalStatus === "rejected") {
      throw new AuthError("Registration was rejected by admin", 403);
    }
    if (!user.active) {
      throw new AuthError("Account deactivated", 403);
    }
  }

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
