"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/Card";

function toImageSrc(input?: string) {
  if (!input) return "";
  if (input.startsWith("data:image")) return input;
  return `data:image/png;base64,${input}`;
}

function PreviewPlaceholder({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/10 p-12 text-center min-h-[280px]">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground max-w-sm">{hint}</p>
    </div>
  );
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
  const [loadFailed, setLoadFailed] = useState<{ desktop: boolean; mobile: boolean }>({
    desktop: false,
    mobile: false,
  });

  const desktopSrc = toImageSrc(screenshots?.desktop || screenshot);
  const mobileSrc = toImageSrc(screenshots?.mobile);

  useEffect(() => {
    setLoadFailed({ desktop: false, mobile: false });
  }, [desktopSrc, mobileSrc]);

  const desktopOk = Boolean(desktopSrc) && !loadFailed.desktop;
  const mobileOk = Boolean(mobileSrc) && !loadFailed.mobile;
  const hasLoadable = desktopOk || mobileOk;

  const fallbackTab = useMemo(() => {
    if (tab === "desktop" && !desktopOk && mobileOk) return "mobile";
    if (tab === "mobile" && !mobileOk && desktopOk) return "desktop";
    return tab;
  }, [tab, desktopOk, mobileOk]);

  const activeSrc = fallbackTab === "desktop" ? desktopSrc : mobileSrc;
  const activeOk = fallbackTab === "desktop" ? desktopOk : mobileOk;

  const handleImageError = () => {
    setLoadFailed((prev) => ({ ...prev, [fallbackTab]: true }));
  };

  return (
    <Card className="transition-transform hover:scale-105">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-0 gap-4 sm:gap-0 pb-4">
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
        {!desktopSrc && !mobileSrc ? (
          <PreviewPlaceholder
            title="Screenshot unavailable"
            hint="No capture was returned for this audit. The site may have blocked automated browsers or the screenshot step timed out."
          />
        ) : !hasLoadable ? (
          <PreviewPlaceholder
            title="Preview couldn’t be displayed"
            hint="The image data was invalid or corrupted. Try running the audit again, or open the site in a normal browser if it blocks headless access."
          />
        ) : activeOk && activeSrc ? (
          <div className="rounded-xl border border-border bg-secondary/10 p-2 shadow-sm">
            <img
              key={`${fallbackTab}-${activeSrc.length}`}
              src={activeSrc}
              alt={`Captured ${fallbackTab} screenshot of ${url}`}
              onError={handleImageError}
              className={
                fallbackTab === "desktop"
                  ? "h-[420px] w-full rounded-lg object-cover object-top border border-border/50 bg-background"
                  : "mx-auto h-[420px] w-auto max-w-full rounded-lg object-contain border border-border/50 bg-background"
              }
            />
          </div>
        ) : (
          <PreviewPlaceholder
            title="Switch viewport"
            hint="This view didn’t load. Use the Desktop / Mobile tabs above if the other capture is available."
          />
        )}
      </CardContent>
    </Card>
  );
}
