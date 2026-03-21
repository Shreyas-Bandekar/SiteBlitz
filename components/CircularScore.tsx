"use client";

export default function CircularScore({ score }: { score: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;

  return (
    <div className="relative flex h-36 w-36 items-center justify-center">
      <svg className="-rotate-90" width="136" height="136" viewBox="0 0 136 136">
        <circle cx="68" cy="68" r={radius} stroke="rgba(255,255,255,0.2)" strokeWidth="10" fill="none" />
        <circle
          cx="68"
          cy="68"
          r={radius}
          stroke="url(#scoreGradient)"
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-black text-white">{score}</div>
        <div className="text-xs text-slate-300">Overall</div>
      </div>
    </div>
  );
}
