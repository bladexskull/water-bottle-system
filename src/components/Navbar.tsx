"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export function Navbar() {
  const { profile, logout } = useAuth();
  if (!profile) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-cyan-900/10 bg-[#f0f9fb]/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href={profile.role === "admin" ? "/admin" : "/member"} className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-700 text-sm font-bold text-white">
            W
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight text-cyan-950">Water Bottle League</p>
            <p className="text-[10px] uppercase tracking-widest text-cyan-700/70">
              {profile.role === "admin" ? "Admin" : "Member"}
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-cyan-900/70 sm:inline">{profile.name}</span>
          {profile.role === "admin" && (
            <Link href="/member" className="text-xs font-medium text-cyan-800 underline-offset-2 hover:underline">
              Member view
            </Link>
          )}
          <button
            onClick={() => logout()}
            className="rounded-lg bg-cyan-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-800"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
