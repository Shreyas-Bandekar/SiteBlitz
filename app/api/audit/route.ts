import { runAuditPipeline } from "../../../lib/audit-pipeline";
import { log } from "../../../lib/logger";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const startedAt = Date.now();
  try {
    const { url, roiEnabled, roiTemplate } = await req.json();
    if (!url || typeof url !== "string") {
      return Response.json({ error: "URL is required." }, { status: 400 });
    }

    log("info", "Audit API request received", { url });
    const report = await runAuditPipeline(url, {
      roiEnabled: Boolean(roiEnabled ?? true),
      roiTemplate: roiTemplate ?? "custom",
    });

    return Response.json({
      ...report,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const lower = message.toLowerCase();
    let humanError = "Audit failed due to an unexpected pipeline error.";
    if (lower.includes("invalid url")) humanError = "Invalid URL. Enter a full domain like https://example.com.";
    else if (lower.includes("timed out")) humanError = "Audit timed out while scanning the site.";
    else if (lower.includes("net::") || lower.includes("dns")) humanError = "Could not reach target site (blocked or unavailable).";

    log("error", "Audit API request failed", {
      error: message,
      elapsedMs: Date.now() - startedAt,
    });
    return Response.json(
      {
        error: humanError,
        details: message,
      },
      { status: 500 }
    );
  }
}
