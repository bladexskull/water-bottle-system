"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { login, configured } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email.trim(), password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  if (!configured) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <p className="text-amber-800">Configure Firebase env vars first. See README.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <Link href="/" className="mb-6 text-sm text-cyan-700 hover:underline">
        ← Water Bottle League
      </Link>
      <h1 className="font-display text-3xl font-bold text-cyan-950">Login</h1>
      <form onSubmit={onSubmit} className="card mt-6 flex flex-col gap-4 p-6">
        <label className="text-sm font-medium">
          Email
          <input
            className="input mt-1"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        <label className="text-sm font-medium">
          Password
          <input
            className="input mt-1"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && <p className="text-sm text-rose-700">{error}</p>}
        <button className="btn-primary" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-cyan-800/70">
        No account?{" "}
        <Link href="/register" className="font-semibold text-cyan-800 underline">
          Register
        </Link>
      </p>
    </main>
  );
}
