"use client";

function getGrade(score: number) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function ringColor(score: number) {
  if (score >= 90) return "border-emerald-300 text-emerald-100";
  if (score >= 80) return "border-cyan-300 text-cyan-100";
  if (score >= 70) return "border-amber-300 text-amber-100";
  if (score >= 60) return "border-orange-300 text-orange-100";
  return "border-rose-300 text-rose-100";
}

export default function LetterGrade({ score }: { score: number }) {
  const grade = getGrade(score);
  return (
    <article className="glass rounded-2xl border border-white/20 bg-gradient-to-br from-white/15 to-white/5 p-6">
      <h2 className="text-xl font-bold text-white">Site Grade</h2>
      <div className="mt-4 flex items-center gap-6">
        <div className={`flex h-28 w-28 items-center justify-center rounded-full border-4 ${ringColor(score)}`}>
          <span className="text-4xl font-black">{grade}</span>
        </div>
        <div>
          <p className="text-3xl font-black text-white">{score}/100</p>
          <p className="text-sm text-slate-300">SEOptimer-style overall quality indicator</p>
        </div>
      </div>
    </article>
  );
}
