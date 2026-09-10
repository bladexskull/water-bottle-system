export function StatCard({
  label,
  value,
  hint,
  accent = "cyan",
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "cyan" | "amber" | "rose" | "emerald";
}) {
  const accents = {
    cyan: "from-cyan-600/10 to-transparent border-cyan-800/10",
    amber: "from-amber-500/15 to-transparent border-amber-700/10",
    rose: "from-rose-500/10 to-transparent border-rose-700/10",
    emerald: "from-emerald-500/10 to-transparent border-emerald-700/10",
  };
  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br ${accents[accent]} bg-white/70 p-4 shadow-sm`}
    >
      <p className="text-[11px] font-medium uppercase tracking-wider text-cyan-800/60">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-cyan-950">{value}</p>
      {hint && <p className="mt-1 text-xs text-cyan-800/50">{hint}</p>}
    </div>
  );
}

export function LoadingScreen({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-cyan-800">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-200 border-t-cyan-700" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
