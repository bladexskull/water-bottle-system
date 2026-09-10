"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function RegisterPage() {
  const { register, configured } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(name.trim(), email.trim(), password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
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
      <h1 className="font-display text-3xl font-bold text-cyan-950">Join the league</h1>
      <p className="mt-2 text-sm text-cyan-800/70">Members start as regular players. Admin is set via env.</p>
      <form onSubmit={onSubmit} className="card mt-6 flex flex-col gap-4 p-6">
        <label className="text-sm font-medium">
          Name
          <input
            className="input mt-1"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </label>
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
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        {error && <p className="text-sm text-rose-700">{error}</p>}
        <button className="btn-primary" disabled={busy}>
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-cyan-800/70">
        Already in?{" "}
        <Link href="/login" className="font-semibold text-cyan-800 underline">
          Login
        </Link>
      </p>
    </main>
  );
}
