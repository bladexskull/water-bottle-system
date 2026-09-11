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
import { getClientAuth, isFirebaseConfigured } from "./firebase/client";
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

async function fetchProfile(token: string, name?: string): Promise<AppUser> {
  const res = await fetch("/api/me", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(name ? { name } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to load profile");
  return data.user as AppUser;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (u: User) => {
    const token = await u.getIdToken(true);
    const userProfile = await fetchProfile(token, u.displayName || undefined);
    setProfile(userProfile);
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
    const cred = await createUserWithEmailAndPassword(
      getClientAuth(),
      email.trim(),
      password
    );
    await updateProfile(cred.user, { displayName: name.trim() });
    // Profile is created server-side (Admin SDK) — avoids Firestore client rule failures
    const token = await cred.user.getIdToken(true);
    const userProfile = await fetchProfile(token, name.trim());
    setProfile(userProfile);
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
