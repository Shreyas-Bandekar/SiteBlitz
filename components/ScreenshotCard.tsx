"use client";

import { useMemo, useState } from "react";

function toImageSrc(input?: string) {
  if (!input) return "";
  if (input.startsWith("data:image")) return input;
  return `data:image/png;base64,${input}`;
}

export default function ScreenshotCard({
  screenshot,
  screenshots,
  url,
}: {
  screenshot?: string;
  screenshots?: { desktop?: string; mobile?: string };
  url: string;
}) {
  const [tab, setTab] = useState<"desktop" | "mobile">("desktop");
  const desktopSrc = toImageSrc(screenshots?.desktop || screenshot);
  const mobileSrc = toImageSrc(screenshots?.mobile);
  const currentSrc = tab === "desktop" ? desktopSrc : mobileSrc;
  const hasAny = Boolean(desktopSrc || mobileSrc);
  const fallbackTab = useMemo(() => {
    if (tab === "desktop" && !desktopSrc && mobileSrc) return "mobile";
    if (tab === "mobile" && !mobileSrc && desktopSrc) return "desktop";
    return tab;
  }, [tab, desktopSrc, mobileSrc]);

  return (
    <article className="glass rounded-2xl border border-white/20 bg-gradient-to-br from-white/15 to-white/5 p-5 transition-transform hover:scale-105">
      <h3 className="mb-2 text-xl font-bold text-white">Website Analysis</h3>
      <p className="mb-3 text-sm text-slate-200">Rendered homepage snapshot for quick visual QA.</p>
      <div className="mb-3 inline-flex rounded-lg border border-white/20 bg-black/20 p-1 text-xs">
        <button
          type="button"
          onClick={() => setTab("desktop")}
          className={`rounded px-3 py-1 ${fallbackTab === "desktop" ? "bg-white/20 text-white" : "text-slate-300"}`}
        >
          Desktop
        </button>
        <button
          type="button"
          onClick={() => setTab("mobile")}
          className={`rounded px-3 py-1 ${fallbackTab === "mobile" ? "bg-white/20 text-white" : "text-slate-300"}`}
        >
          Mobile
        </button>
      </div>
      {hasAny && currentSrc ? (
        <img
          src={currentSrc}
          alt={`Captured ${fallbackTab} screenshot of ${url}`}
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
