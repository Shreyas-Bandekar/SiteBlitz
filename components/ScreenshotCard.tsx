"use client";

export default function ScreenshotCard({ screenshot, url }: { screenshot?: string; url: string }) {
  return (
    <article className="glass rounded-2xl border border-white/20 bg-gradient-to-br from-white/15 to-white/5 p-5 transition-transform hover:scale-105">
      <h3 className="mb-2 text-xl font-bold text-white">Website Analysis</h3>
      <p className="mb-3 text-sm text-slate-200">Rendered homepage snapshot for quick visual QA.</p>
      {screenshot ? (
        <img
          src={`data:image/png;base64,${screenshot}`}
          alt={`Captured screenshot of ${url}`}
          className="max-h-[420px] w-full rounded-xl border border-white/20 object-contain"
        />
      ) : (
        <div className="rounded-xl border border-dashed border-white/25 p-8 text-center text-sm text-slate-300">
          Screenshot unavailable (timeout or blocked by site policy).
        </div>
      )}
    </article>
  );
}
