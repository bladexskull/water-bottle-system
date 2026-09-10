"use client";

interface BottleCounterProps {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}

export function BottleCounter({ value, onChange, min = 0, max = 20 }: BottleCounterProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      <button
        type="button"
        aria-label="Decrease"
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-100 text-2xl font-bold text-cyan-900 active:scale-95"
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        −
      </button>
      <div className="min-w-[4.5rem] text-center">
        <p className="text-5xl font-bold tabular-nums text-cyan-950">{value}</p>
        <p className="text-xs uppercase tracking-wider text-cyan-700/60">bottles</p>
      </div>
      <button
        type="button"
        aria-label="Increase"
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-700 text-2xl font-bold text-white active:scale-95"
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        +
      </button>
    </div>
  );
}
