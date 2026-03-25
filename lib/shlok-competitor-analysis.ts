import type { BenchmarkSite } from "./audit-types";
import type { ShlokLocationSignals } from "./shlok-location-detection";

type GeoBenchmarkSite = BenchmarkSite & {
  city?: string;
  district?: string;
  state?: string;
  country?: string;
};

export interface ShlokCompanyProfile {
  name: string;
  location: ShlokLocationSignals;
  description: string;
  companySize: string;
  services: string[];
  targetMarket: string;
  type: string;
}

export interface ShlokCompetitorCategory {
  name: string;
  competitors: GeoBenchmarkSite[];
  rationale: string;
}

export interface ShlokCompetitorAnalysisResponse {
  targetCompany: ShlokCompanyProfile;
  competitorCategories: ShlokCompetitorCategory[];
  directCompetitors: GeoBenchmarkSite[];
  analysisNotes: string;
}

export function buildShlokCompanyProfile(
  url: string,
  location: ShlokLocationSignals,
  industry: string,
  htmlRaw?: string
): ShlokCompanyProfile {
  const domain = extractDomain(url);
  const displayName = domain.replace(/-/g, " ");
  const pageText = extractVisibleText(htmlRaw || "");
  const services = detectServicesFromText(pageText);
  const companySize = detectCompanySize(pageText);
  const targetMarket = detectTargetMarket(pageText, location.country);
  const industryLabel = industry.replace(/_/g, " ");
  const baseLocation = [location.city, location.state, location.country].filter(Boolean).join(", ") || "unknown location";

  return {
    name: displayName,
    location,
    description: `${displayName} appears to operate in ${industryLabel} based on publicly available website content from ${baseLocation}.`,
    companySize,
    services,
    targetMarket,
    type: industryLabel,
  };
}

export function categorizeShlokCompetitors(
  allCompetitors: GeoBenchmarkSite[],
  targetLocation: ShlokLocationSignals
): ShlokCompetitorCategory[] {
  const categories: ShlokCompetitorCategory[] = [];

  const sameCity = allCompetitors.filter(
    (c) => c.city && targetLocation.city && c.city.toLowerCase() === targetLocation.city.toLowerCase()
  );
  if (sameCity.length > 0) {
    categories.push({
      name: `${targetLocation.city}-based Competitors (Same City)`,
      competitors: sameCity.slice(0, 5),
      rationale: `Direct competitors in ${targetLocation.city}. These companies understand local market dynamics and customer preferences.`,
    });
  }

  const sameState = allCompetitors.filter(
    (c) =>
      c.state &&
      targetLocation.state &&
      c.state.toLowerCase() === targetLocation.state.toLowerCase() &&
      !sameCity.find((sc) => sc.url === c.url)
  );
  if (sameState.length > 0) {
    categories.push({
      name: `${targetLocation.state} State Competitors`,
      competitors: sameState.slice(0, 5),
      rationale: "Regional competitors with similar state-level market conditions.",
    });
  }

  const sameCountry = allCompetitors.filter(
    (c) =>
      c.country &&
      targetLocation.country &&
      c.country.toLowerCase() === targetLocation.country.toLowerCase() &&
      !sameCity.find((sc) => sc.url === c.url) &&
      !sameState.find((ss) => ss.url === c.url)
  );
  if (sameCountry.length > 0) {
    categories.push({
      name: `${targetLocation.country} National Competitors`,
      competitors: sameCountry.slice(0, 5),
      rationale: `National-level competitors operating across ${targetLocation.country}.`,
    });
  }

  const globalCompetitors = allCompetitors.filter(
    (c) =>
      !sameCity.find((sc) => sc.url === c.url) &&
      !sameState.find((ss) => ss.url === c.url) &&
      !sameCountry.find((snc) => snc.url === c.url)
  );
  if (globalCompetitors.length > 0) {
    categories.push({
      name: "Global Competitors (International)",
      competitors: globalCompetitors.slice(0, 3),
      rationale: "International competitors for cross-border comparison and innovation benchmarking.",
    });
  }

  return categories;
}

export function generateShlokCompetitorAnalysis(
  company: ShlokCompanyProfile,
  competitors: GeoBenchmarkSite[]
): ShlokCompetitorAnalysisResponse {
  const categories = categorizeShlokCompetitors(competitors, company.location);
  const directCompetitors = categories
    .filter((c) => c.name.includes("Same City") || c.name.includes("State Competitors"))
    .flatMap((c) => c.competitors)
    .slice(0, 3);

  const analysisNotes = [
    `${company.name} Competitive Landscape Analysis`,
    `Primary Location: ${company.location.city || "N/A"}, ${company.location.state || company.location.country || "N/A"}`,
    `Company Type: ${company.type}`,
    `Size: ${company.companySize}`,
    `Target Market: ${company.targetMarket}`,
    `Direct competitors considered: ${directCompetitors.length}`,
    `Competition intensity: ${directCompetitors.length > 1 ? "HIGH" : directCompetitors.length === 1 ? "MEDIUM" : "LOW"}`,
    "Notes are derived from crawled page signals and benchmark records only.",
  ].join("\n");

  return {
    targetCompany: company,
    competitorCategories: categories,
    directCompetitors,
    analysisNotes,
  };
}

export function formatShlokAnalysisMarkdown(analysis: ShlokCompetitorAnalysisResponse): string {
  const lines: string[] = [];

  lines.push(`## ${analysis.targetCompany.name} - Competitor Analysis`);
  lines.push("");
  lines.push("### Company Profile");
  lines.push(analysis.targetCompany.description);
  lines.push("");
  lines.push(
    `Location: ${analysis.targetCompany.location.city || "N/A"}, ${analysis.targetCompany.location.state || analysis.targetCompany.location.country || "N/A"}`
  );
  lines.push(`Type: ${analysis.targetCompany.type}`);
  lines.push(`Size: ${analysis.targetCompany.companySize}`);
  lines.push(`Target: ${analysis.targetCompany.targetMarket}`);
  lines.push("");

  lines.push("### Services");
  if (analysis.targetCompany.services.length === 0) {
    lines.push("- Not confidently detected from public page content.");
  } else {
    analysis.targetCompany.services.forEach((s) => {
      lines.push(`- ${s}`);
    });
  }
  lines.push("");

  lines.push("### Competitor Buckets");
  analysis.competitorCategories.forEach((category) => {
    lines.push(`**${category.name}**`);
    lines.push(category.rationale);
    lines.push("");
    category.competitors.forEach((comp) => {
      const location = comp.city || comp.state || comp.country
        ? ` (${[comp.city, comp.state, comp.country].filter(Boolean).join(", ")})`
        : "";
      lines.push(`- [${comp.name}](${comp.url}) - Overall: ${comp.overall}/100${location}`);
    });
    lines.push("");
  });

  lines.push("### Analysis");
  lines.push(analysis.analysisNotes);

  return lines.join("\n");
}

export function formatShlokCompetitorResponse(
  url: string,
  location: ShlokLocationSignals,
  industry: string,
  competitors: GeoBenchmarkSite[],
  htmlRaw?: string
) {
  const company = buildShlokCompanyProfile(url, location, industry, htmlRaw);
  const analysis = generateShlokCompetitorAnalysis(company, competitors);
  return {
    company,
    analysis,
    markdown: formatShlokAnalysisMarkdown(analysis),
  };
}

function extractVisibleText(html: string): string {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function detectServicesFromText(text: string): string[] {
  const map: Array<{ regex: RegExp; label: string }> = [
    { regex: /web(\s|-)?development|website development/, label: "Web Development" },
    { regex: /mobile(\s|-)?app|android|ios/, label: "Mobile App Development" },
    { regex: /machine learning|artificial intelligence|\bai\b/, label: "AI and Machine Learning" },
    { regex: /crm|erp/, label: "CRM and ERP Solutions" },
    { regex: /digital marketing|seo|social media/, label: "Digital Marketing" },
    { regex: /ui\/?ux|user experience|design system/, label: "UI and UX Design" },
    { regex: /cloud|devops|aws|azure|gcp/, label: "Cloud and DevOps" },
    { regex: /ecommerce|shop|checkout|cart/, label: "Ecommerce Solutions" },
  ];

  return map.filter((x) => x.regex.test(text)).map((x) => x.label).slice(0, 8);
}

function detectCompanySize(text: string): string {
  const teamMatch = text.match(/(\d{1,4})\s*(\+)?\s*(employees|team members|people)/i);
  if (teamMatch) {
    return `${teamMatch[1]}${teamMatch[2] || ""} employees (from website text)`;
  }
  return "Not publicly listed";
}

function detectTargetMarket(text: string, country?: string): string {
  const candidates: Array<{ regex: RegExp; label: string }> = [
    { regex: /startup|startups/, label: "Startups" },
    { regex: /small business|sme|smb/, label: "SMEs" },
    { regex: /enterprise|large business|fortune/, label: "Enterprises" },
    { regex: /global|international/, label: "Global clients" },
    { regex: /india|indian/, label: "Indian market" },
  ];
  const found = candidates.filter((x) => x.regex.test(text)).map((x) => x.label);
  if (found.length > 0) return found.slice(0, 3).join(", ");
  if (country) return `${country} market (inferred from location)`;
  return "Not clearly stated";
}

function extractDomain(url: string): string {
  try {
    const domain = new URL(url).hostname.replace(/^www\./, "");
    return domain.split(".")[0];
  } catch {
    return "Company";
  }
}
