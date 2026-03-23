// lib/leadgen.ts - ACTUAL LEAD GEN SCORING
export function analyzeLeadGen(healthData: { html: string; lighthouse?: any }): { score: number; issues: string[]; quick_wins: any[] } {
  const { html } = healthData;
  const elements = {
    forms: (html.match(/<form[^>]*>/gi) || []).length,
    buttons: (html.match(/<button[^>]*>/gi) || []).length + (html.match(/cta|contact|get quote|free trial/i) || []).length,
    inputs: (html.match(/input.*(submit|email|tel)/gi) || []).length,
    links: (html.match(/(tel:|mailto:|whatsapp)/gi) || []).length,
    above_fold: html.slice(0, 5000).match(/(cta|quote|contact|call)/i) ? 25 : 0
  };
  
  const score = Math.min(100, 
    elements.forms * 20 + 
    elements.buttons * 15 + 
    elements.inputs * 20 + 
    elements.links * 25 + 
    elements.above_fold
  );
  
  const issues: string[] = [];
  const quick_wins: any[] = [];
  
  if (elements.forms === 0) {
    issues.push("No visible forms detected");
    quick_wins.push({
      action: "Hero → 'Get Quote' sticky CTA", 
      effort: "5min", 
      impact: "+18% conversions",
      code: `<button class="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-full shadow-lg z-50">💬 Get Quote</button>`
    });
  }
  
  if (elements.links === 0) {
    quick_wins.push({
      action: "Add WhatsApp/tel above fold", 
      effort: "10min", 
      impact: "+12% leads",
      code: `<a href="https://wa.me/YOUR_NUMBER" class="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-lg">📱 WhatsApp</a>`
    });
  }
  
  return { score: Math.round(score), issues, quick_wins };
}
