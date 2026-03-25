"use client";

export default function CircularScore({ score }: { score: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;

  return (
    <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
      <svg className="-rotate-90" width="136" height="136" viewBox="0 0 136 136">
        <circle cx="68" cy="68" r={radius} stroke="currentColor" className="text-secondary" strokeWidth="10" fill="none" />
        <circle
          cx="68"
          cy="68"
          r={radius}
          stroke="currentColor"
          className="text-primary"
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute text-center flex flex-col items-center">
        <div className="text-3xl font-black text-foreground">{score}</div>
        <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Overall</div>
      </div>
    </div>
  );
}
