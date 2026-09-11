"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getClientAuth, getClientDb, isFirebaseConfigured } from "./firebase/client";
import type { AppUser } from "./types";

interface AuthContextValue {
  user: User | null;
  profile: AppUser | null;
  loading: boolean;
  configured: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (u: User) => {
    const db = getClientDb();
    const ref = doc(db, "users", u.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const data: AppUser = {
        uid: u.uid,
        name: u.displayName || u.email?.split("@")[0] || "Member",
        email: u.email || "",
        role: "member",
        active: false,
        approvalStatus: "pending",
        createdAt: new Date().toISOString(),
      };
      await setDoc(ref, data);
    }
    try {
      const token = await u.getIdToken();
      const res = await fetch("/api/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setProfile(data.user as AppUser);
          return;
        }
      }
    } catch {
      // fall through
    }
    const again = await getDoc(ref);
    const raw = again.data() as AppUser;
    setProfile({
      ...raw,
      approvalStatus: raw.approvalStatus || (raw.active ? "approved" : "pending"),
    });
  }, []);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const auth = getClientAuth();
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          await loadProfile(u);
        } catch (e) {
          console.error(e);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [configured, loadProfile]);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(getClientAuth(), email, password);
  };

  const register = async (name: string, email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(getClientAuth(), email, password);
    await updateProfile(cred.user, { displayName: name });
    const data: AppUser = {
      uid: cred.user.uid,
      name,
      email,
      role: "member",
      active: false,
      approvalStatus: "pending",
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(getClientDb(), "users", cred.user.uid), data);
    // Server may promote configured admin
    try {
      const token = await cred.user.getIdToken();
      const res = await fetch("/api/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const body = await res.json();
        if (body.user) {
          setProfile(body.user as AppUser);
          return;
        }
      }
    } catch {
      // ignore
    }
    setProfile(data);
  };

  const logout = async () => {
    await signOut(getClientAuth());
  };

  const getIdToken = async () => {
    if (!user) return null;
    return user.getIdToken();
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user);
  };

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      configured,
      login,
      register,
      logout,
      getIdToken,
      refreshProfile,
    }),
    [user, profile, loading, configured]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export async function apiFetch(
  path: string,
  token: string | null,
  options: RequestInit = {}
) {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export function isApprovedMember(profile: AppUser | null): boolean {
  if (!profile) return false;
  const status = profile.approvalStatus || (profile.active ? "approved" : "pending");
  return profile.active && status === "approved";
}
