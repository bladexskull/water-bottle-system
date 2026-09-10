"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { LoadingScreen } from "@/components/ui";

export default function HomePage() {
  const { user, profile, loading, configured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!configured) return;
    if (user && profile) {
      router.replace(profile.role === "admin" ? "/admin" : "/member");
    }
  }, [user, profile, loading, configured, router]);

  if (loading) return <LoadingScreen />;

  if (!configured) {
    return (
      <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-16">
        <h1 className="font-display text-3xl font-bold text-cyan-950">Water Bottle League</h1>
        <div className="card p-6">
          <p className="font-semibold text-amber-800">Firebase not configured</p>
          <p className="mt-2 text-sm text-cyan-900/70">
            Copy <code className="rounded bg-cyan-100 px-1">.env.example</code> to{" "}
            <code className="rounded bg-cyan-100 px-1">.env.local</code> and add your Firebase
            credentials. See README for steps.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-cyan-300/30 blur-3xl" />
        <div className="absolute -right-10 bottom-20 h-72 w-72 rounded-full bg-teal-200/40 blur-3xl" />
      </div>
      <p className="font-display text-5xl font-bold tracking-tight text-cyan-950">
        Water Bottle League
      </p>
      <p className="mt-3 text-cyan-800/70">
        Private monthly hydration competition. Submit daily bottles. Highest strike rate wins dinner.
      </p>
      <p className="mt-2 text-xs text-cyan-700/50">
        Tracking game only — not medical advice. Bottle size shown in-app (default 1L).
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/login" className="btn-primary text-center">
          Login
        </Link>
        <Link
          href="/register"
          className="rounded-xl border border-cyan-800/20 bg-white/70 px-5 py-3 text-center font-semibold text-cyan-900"
        >
          Register
        </Link>
      </div>
    </main>
  );
}
