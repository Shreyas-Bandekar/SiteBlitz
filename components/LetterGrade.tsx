"use client";

import { Card, CardContent } from "./ui/Card";

function getGrade(score: number) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function ringColor(score: number) {
  if (score >= 90) return "border-success text-success bg-success/10";
  if (score >= 80) return "border-success text-success bg-success/10";
  if (score >= 70) return "border-warning text-warning bg-warning/10";
  if (score >= 60) return "border-warning text-warning bg-warning/10";
  return "border-destructive text-destructive bg-destructive/10";
}

export default function LetterGrade({ score }: { score: number }) {
  const grade = getGrade(score);
  return (
    <Card className="min-w-fit">
      <CardContent className="h-full pt-6">
        <h2 className="text-xl font-bold tracking-tight text-foreground">Site Grade</h2>
        <div className="mt-4 flex items-center gap-6">
          <div className={`flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-full border-4 shadow-sm ${ringColor(score)}`}>
            <span className="text-4xl font-black">{grade}</span>
          </div>
          <div>
            <p className="text-3xl font-black text-foreground">{score}/100</p>
            <p className="text-xs font-medium text-muted-foreground mt-1 max-w-[140px] leading-relaxed">SEOptimer-style overall quality indicator</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
