// lib/cv-client.ts - OPTIONAL COMPUTER VISION BRIDGE
type CVScoreResponse = {
  ui_ux_score: number;
  cv_breakdown: {
    contrast: number;
    layout: number;
    typography: number;
    color: number;
    space: number;
  };
  issues?: string[];
};

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isValidCVResponse(value: unknown): value is CVScoreResponse {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  const breakdown = data.cv_breakdown as Record<string, unknown> | undefined;
  if (!isFiniteNumber(data.ui_ux_score) || !breakdown) return false;
  return (
    isFiniteNumber(breakdown.contrast) &&
    isFiniteNumber(breakdown.layout) &&
    isFiniteNumber(breakdown.typography) &&
    isFiniteNumber(breakdown.color) &&
    isFiniteNumber(breakdown.space)
  );
}

export async function getCVScore(screenshotB64: string | undefined): Promise<CVScoreResponse | null> {
  if (!process.env.FLASK_CV_URL || !screenshotB64) {
    console.log('[cv-client] CV disabled or no screenshot - using AI text fallback only');
    return null;
  }
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2200);

  try {
    const res = await fetch(`${process.env.FLASK_CV_URL.trim()}/ui-score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ screenshot: screenshotB64 }),
      signal: controller.signal,
    });
    
    if (!res.ok) {
        console.warn(`[cv-client] CV service responded with ${res.status}`);
        return null;
    }

    const json: unknown = await res.json();
    if (!isValidCVResponse(json)) {
      console.warn("[cv-client] CV service returned invalid payload shape");
      return null;
    }
    return json;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      console.warn('[cv-client] CV request timed out - using AI text fallback only');
      return null;
    }
    console.warn('[cv-client] CV service unreachable - using AI text fallback only');
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
