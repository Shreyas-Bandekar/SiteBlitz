import { NextRequest, NextResponse } from "next/server";
import { runAuditPipeline } from "../../../../lib/audit-pipeline";
import { detectShlokLocationSignals } from "../../../../lib/shlok-location-detection";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { url, htmlRaw } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Missing or invalid 'url' parameter" }, { status: 400 });
    }

    let rawHtml = typeof htmlRaw === "string" ? htmlRaw : "";
    if (!rawHtml) {
      const audit = await runAuditPipeline(url, { includeAi: false });
      rawHtml = String(audit?.rawHtml || "");
    }

    const location = detectShlokLocationSignals(rawHtml, url);
    return NextResponse.json({ success: true, targetUrl: url, location });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to detect location signals",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
