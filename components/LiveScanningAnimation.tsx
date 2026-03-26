"use client";

import { CheckCircle2, CircleDashed, ServerCog } from "lucide-react";
import { Card, CardContent } from "./ui/Card";

const stages = [
  "Validating URL & DNS",
  "Headless Chrome Emulation",
  "Axe Core Accessibility Pass",
  "Mobile Device Emulation",
  "Visual DOM Capture",
  "Lighthouse Core Scoring",
  "Report Structure Assembly",
  "AI Insights & Telemetry",
];

export default function LiveScanningAnimation({ active }: { active: number }) {
  return (
    <Card className="overflow-hidden shadow-sm">
      <div className="border-b border-border bg-secondary/30 px-6 py-4">
        <div className="flex items-center gap-3">
          <ServerCog className="h-5 w-5 animate-pulse text-primary" />
          <h3 className="font-semibold tracking-tight text-foreground">
            Executing Audit Pipeline
          </h3>
        </div>
      </div>
      <CardContent className="p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stages.map((stage, index) => {
            const isCompleted = index < active;
            const isCurrent = index === active;
            const isPending = index > active;

            return (
              <div
                key={stage}
                className={`relative flex flex-col justify-between overflow-hidden rounded-md border p-4 transition-all ${
                  isCompleted
                    ? "border-success/30 bg-success/10"
                    : isCurrent
                      ? "border-primary/50 bg-primary/10 shadow-sm"
                      : "border-border bg-card"
                }`}
              >
                {isCurrent && (
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0"
                    style={{ transform: "translateX(0)" }}
                  />
                )}

                <div className="mb-4 flex items-center justify-between">
                  <span
                    className={`text-xs font-mono font-medium uppercase ${
                      isCompleted
                        ? "text-success"
                        : isCurrent
                          ? "text-primary"
                          : "text-muted-foreground"
                    }`}
                  >
                    {isCompleted
                      ? "DONE"
                      : isCurrent
                        ? "IN PROGRESS"
                        : "PENDING"}
                  </span>
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : isCurrent ? (
                    <CircleDashed className="h-4 w-4 animate-spin text-primary" />
                  ) : null}
                </div>
                <div className="text-sm font-medium text-foreground/80">
                  {stage}
                </div>

                <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full ${isCompleted ? "bg-success" : isCurrent ? "bg-primary" : "bg-transparent"}`}
                    style={{
                      width: isCompleted ? "100%" : isCurrent ? "70%" : "0%",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
