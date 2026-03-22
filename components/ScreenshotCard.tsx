"use client";

import { useMemo, useState } from "react";

function toImageSrc(input?: string) {
  if (!input) return "";
  if (input.startsWith("data:image")) return input;
  return `data:image/png;base64,${input}`;
}

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/Card";

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
  const hasAny = Boolean(desktopSrc || mobileSrc);
  const fallbackTab = useMemo(() => {
    if (tab === "desktop" && !desktopSrc && mobileSrc) return "mobile";
    if (tab === "mobile" && !mobileSrc && desktopSrc) return "desktop";
    return tab;
  }, [tab, desktopSrc, mobileSrc]);
  const currentSrc = fallbackTab === "desktop" ? desktopSrc : mobileSrc;

  return (
    <Card className="transition-transform hover:scale-105">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle>Website Analysis</CardTitle>
          <CardDescription>Rendered homepage snapshot for quick visual QA.</CardDescription>
        </div>
        <div className="inline-flex items-center rounded-lg border border-border bg-secondary/30 p-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => setTab("desktop")}
            className={`rounded-md px-3 py-1 transition-colors ${fallbackTab === "desktop" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"}`}
          >
            Desktop
          </button>
          <button
            type="button"
            onClick={() => setTab("mobile")}
            className={`rounded-md px-3 py-1 transition-colors ${fallbackTab === "mobile" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"}`}
          >
            Mobile
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {hasAny && currentSrc ? (
          <div className="rounded-xl border border-border bg-secondary/10 p-2 shadow-sm">
            <img
              src={currentSrc}
              alt={`Captured ${fallbackTab} screenshot of ${url}`}
              className={
                fallbackTab === "desktop"
                  ? "h-[420px] w-full rounded-lg object-cover object-top border border-border/50"
                  : "mx-auto h-[420px] w-auto max-w-full rounded-lg object-contain border border-border/50"
              }
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/10 p-12 text-center">
            <p className="text-sm font-medium text-foreground">Screenshot unavailable</p>
            <p className="mt-1 text-xs text-muted-foreground">Timeout or blocked by site policy.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
