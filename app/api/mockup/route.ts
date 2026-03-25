import { NextResponse } from "next/server";
import { generateMockupJson } from "../../../lib/mockup-generator";
import type { Issue } from "../../../lib/audit-types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url, issues, score } = body;
    let { html } = body;

    if (!url || typeof url !== "string") {
      return Response.json({ status: "error", message: "URL is required" }, { status: 400 });
    }

    const parsedIssues: Issue[] = Array.isArray(issues) ? issues : [];

    if (!html) {
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        });
        if (res.ok) {
          html = await res.text();
        } else {
          html = "<!DOCTYPE html><html><head><title>Mockup</title></head><body><h1>Could not load source HTML</h1><p>Please check the URL or try again.</p></body></html>";
        }
      } catch {
        html = "<!DOCTYPE html><html><head><title>Mockup</title></head><body><h1>Could not load source HTML</h1><p>Failed to parse.</p></body></html>";
      }
    }

    const { mockupJson, fallbackUsed, error } = await generateMockupJson(html, parsedIssues);

    return Response.json({
      status: "success",
      mockupData: mockupJson,
      fallbackUsed,
      error
    });
  } catch (error) {
    console.error("[api:mockup] Error generating mockup:", error);
    return Response.json(
      { status: "error", message: "Failed to generate mockup." },
      { status: 500 }
    );
  }
}
