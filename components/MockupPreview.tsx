import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { Camera, Code, Play, AlertTriangle } from "lucide-react";
import Image from "next/image";
import MockupRenderer, { MockupJson } from "./MockupRenderer";

type MockupPreviewProps = {
  originalScreenshot?: string;
  mockupData?: MockupJson;
  fallbackUsed?: boolean;
  error?: string;
};

function toImageSrc(input?: string) {
  if (!input) return "";
  if (input.startsWith("data:image") || input.startsWith("http")) return input;
  return `data:image/png;base64,${input}`;
}

export default function MockupPreview({
  originalScreenshot,
  mockupData,
  fallbackUsed,
  error
}: MockupPreviewProps) {
  const [view, setView] = useState<"original" | "improved">("improved");

  return (
    <Card className="mt-8 border-indigo-500/20 bg-indigo-500/5 shadow-xl shadow-indigo-500/10">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-indigo-400">
              AI-Enhanced Preview <Badge variant="outline" className="text-xs border-indigo-500/30 text-indigo-300">Generative Layout</Badge>
            </CardTitle>
            <CardDescription className="text-indigo-200/70 block mt-1">
              A high-converting SaaS landing page generated dynamically from your website's context.
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2 rounded-lg bg-background p-1 border border-border">
            <button
              onClick={() => setView("original")}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                view === "original"
                  ? "bg-secondary text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              }`}
            >
              <Camera className="h-3.5 w-3.5" />
              Original
            </button>
            <button
              onClick={() => setView("improved")}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                view === "improved"
                  ? "bg-indigo-500 text-white shadow-sm shadow-indigo-500/20"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              }`}
            >
              <Play className="h-3.5 w-3.5" />
              Improved
            </button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {fallbackUsed && (
          <div className="flex items-center gap-2 rounded-xl bg-orange-500/10 p-3 text-xs text-orange-400 border border-orange-500/20">
            <AlertTriangle className="h-4 w-4" />
            <span>AI Layout generation failed limit or missing key. Showing a fallback optimization template. {error && `(${error})`}</span>
          </div>
        )}

        <div className="relative aspect-[4/3] sm:aspect-video w-full overflow-hidden rounded-xl border border-border bg-background/50 shadow-inner">
          {view === "original" ? (
            originalScreenshot ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={toImageSrc(originalScreenshot)}
                alt="Original Site Screenshot"
                className="h-full w-full object-cover object-top"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-foreground/50">
                No screenshot available
              </div>
            )
          ) : (
            <div className="h-full w-full relative">
               <MockupRenderer data={mockupData} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
