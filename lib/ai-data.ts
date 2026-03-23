// lib/ai-data.ts - DOMAIN-AWARE COMPACT DATA
export function prepareAuditData(rawData: any) {
  const html = rawData.html || "";
  const url = rawData.url || "";
  
  // Robust Title Extraction
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "Unknown Site";
  
  // Signal-based Classification
  let url_type: 'ecommerce' | 'saas' | 'agency' | 'local_service' | 'other' = 'other';
  
  const ecommerceSignals = [/cart/i, /checkout/i, /product/i, /shop/i, /store/i, /inventory/i, /ecommerce/i];
  const saasSignals = [/saas/i, /pricing/i, /dashboard/i, /platform/i, /enterprise/i, /software/i];
  const agencySignals = [/agency/i, /portfolio/i, /services/i, /projects/i, /clients/i, /consulting/i, /development/i];
  const localServiceSignals = [/plumber/i, /electrician/i, /dentist/i, /lawyer/i, /cleaning/i, /repair/i, /service/i];
  
  const textContent = (url + " " + title + " " + html.slice(0, 10000)).toLowerCase();
  
  if (ecommerceSignals.some(s => s.test(textContent))) url_type = 'ecommerce';
  else if (saasSignals.some(s => s.test(textContent))) url_type = 'saas';
  else if (localServiceSignals.some(s => s.test(textContent))) url_type = 'local_service';
  else if (agencySignals.some(s => s.test(textContent))) url_type = 'agency';

  return {
    title,
    url_type,
    perf: typeof rawData.lighthouse?.performance === 'number' ? rawData.lighthouse.performance.toFixed(2) : '0.50',
    seo: typeof rawData.lighthouse?.seo === 'number' ? rawData.lighthouse.seo.toFixed(2) : '0.50',
    accessibility: typeof rawData.lighthouse?.accessibility === 'number' ? rawData.lighthouse.accessibility.toFixed(2) : '0.50',
    lead_score: rawData.leadData?.score || 50,
    top_issues: rawData.lighthouse?.audits?.slice(0, 3).map((a: any) => a.id) || [],
    has_forms: html.includes('<form') || html.includes('form') || false
  };
}
