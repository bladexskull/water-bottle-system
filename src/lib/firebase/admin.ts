import {
  initializeApp,
  getApps,
  cert,
  applicationDefault,
  type App,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

let app: App | null = null;

export function getAdminApp(): App {
  if (app) return app;
  if (getApps().length) {
    app = getApps()[0]!;
    return app;
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (clientEmail && privateKey && projectId) {
    app = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
  } else if (projectId) {
    // Local/dev fallback when ADC is available
    try {
      app = initializeApp({
        credential: applicationDefault(),
        projectId,
      });
    } catch {
      app = initializeApp({ projectId });
    }
  } else {
    throw new Error("Firebase Admin is not configured");
  }
  return app;
}

export function adminAuth() {
  return getAuth(getAdminApp());
}

export function adminDb() {
  return getFirestore(getAdminApp());
}

export { FieldValue };

export function getConfiguredAdminEmail(): string | null {
  return process.env.ADMIN_EMAIL?.toLowerCase().trim() || null;
}

export function getConfiguredAdminUid(): string | null {
  return process.env.ADMIN_UID?.trim() || null;
}

export function isConfiguredAdmin(uid: string, email?: string | null): boolean {
  const adminUid = getConfiguredAdminUid();
  if (adminUid && uid === adminUid) return true;
  const adminEmail = getConfiguredAdminEmail();
  if (adminEmail && email?.toLowerCase() === adminEmail) return true;
  return false;
}
