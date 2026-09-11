"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, isApprovedMember } from "@/lib/auth-context";
import { LoadingScreen } from "@/components/ui";

export default function PendingPage() {
  const { user, profile, loading, logout, refreshProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (profile && isApprovedMember(profile)) {
      router.replace(profile.role === "admin" ? "/admin" : "/member");
    }
  }, [user, profile, loading, router]);

  if (loading || !profile) return <LoadingScreen />;

  const status = profile.approvalStatus || "pending";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <h1 className="font-display text-2xl font-bold text-cyan-950">Water Bottle League</h1>
      {status === "rejected" ? (
        <>
          <p className="mt-4 text-rose-700">
            Your registration was rejected by the admin. Contact the flat admin if this is a
            mistake.
          </p>
        </>
      ) : (
        <>
          <p className="mt-4 text-cyan-900">
            Thanks for registering, <strong>{profile.name}</strong>.
          </p>
          <p className="mt-2 text-sm text-cyan-800/70">
            Your account is waiting for admin approval. You can&apos;t use the league until an
            admin approves you.
          </p>
        </>
      )}
      <div className="mt-6 flex gap-3">
        <button
          className="rounded-xl border border-cyan-800/20 bg-white px-4 py-2 text-sm font-semibold"
          onClick={() => refreshProfile()}
        >
          Check again
        </button>
        <button className="btn-primary py-2 text-sm" onClick={() => logout()}>
          Logout
        </button>
      </div>
    </main>
  );
}
