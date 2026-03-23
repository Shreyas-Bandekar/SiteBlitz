// lib/cv-client.ts - OPTIONAL COMPUTER VISION BRIDGE
export async function getCVScore(screenshotB64: string | undefined): Promise<any | null> {
  if (!process.env.FLASK_CV_URL || !screenshotB64) {
    console.log('[cv-client] CV disabled or no screenshot - using Gemini fallback only');
    return null;
  }
  
  try {
    const res = await fetch(`${process.env.FLASK_CV_URL.trim()}/ui-score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ screenshot: screenshotB64 }),
    });
    
    if (!res.ok) {
        console.warn(`[cv-client] CV service responded with ${res.status}`);
        return null;
    }
    
    return await res.json();
  } catch (e) {
    console.warn('[cv-client] CV service unreachable - Gemini fallback only');
    return null;
  }
}
