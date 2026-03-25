// lib/ai-monitor.ts - LOG FAILURES
export function logAIAttempt(attempt: number, dataSize: number, success: boolean, retry_count: number) {
  const status = success ? 'SUCCESS' : 'FAILED';
  const prefix = `[ai:monitor] Attempt ${attempt}/${retry_count}`;
  console.log(`${prefix}: ${dataSize} chars, ${status}`);
  
  if (!success && attempt === retry_count) {
    console.error(`${prefix} All retries exhausted. Falling back to deterministic results.`);
  }
}
