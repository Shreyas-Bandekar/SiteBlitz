import type { LocationSignals, BenchmarkSite } from "./audit-types";

export interface CompanyProfile {
  name: string;
  location: LocationSignals;
  description: string;
  companySize: string;
  services: string[];
  targetMarket: string;
  type: string;
}

export interface CompetitorAnalysisResponse {
  targetCompany: CompanyProfile;
  competitorCategories: CompetitorCategory[];
  directCompetitors: BenchmarkSite[];
  analysisNotes: string;
}

export interface CompetitorCategory {
  name: string;
  competitors: BenchmarkSite[];
  rationale: string;
}

/**
 * Extract company profile from location and industry signals
 */
export function buildCompanyProfile(
  url: string,
  location: LocationSignals,
  industry: string,
  htmlRaw?: string
): CompanyProfile {
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

/**
 * Filter and categorize competitors by location proximity
 */
export function categorizeCompetitors(
  allCompetitors: BenchmarkSite[],
  targetLocation: LocationSignals
): CompetitorCategory[] {
  const categories: CompetitorCategory[] = [];

  // Same city competitors
  const sameCity = allCompetitors.filter(
    (c) =>
      c.city &&
      targetLocation.city &&
      c.city.toLowerCase() === targetLocation.city.toLowerCase()
  );
  if (sameCity.length > 0) {
    categories.push({
      name: `🏢 ${targetLocation.city}-based Competitors (Same City)`,
      competitors: sameCity.slice(0, 5),
      rationale: `Direct competitors in ${targetLocation.city}. These companies understand local market dynamics, customer preferences, and regional business practices.`,
    });
  }

  // Same state competitors
  const sameState = allCompetitors.filter(
    (c) =>
      c.state &&
      targetLocation.state &&
      c.state.toLowerCase() === targetLocation.state.toLowerCase() &&
      !sameCity.find((sc) => sc.url === c.url)
  );
  if (sameState.length > 0) {
    categories.push({
      name: `🗺️ ${targetLocation.state} State Competitors`,
      competitors: sameState.slice(0, 5),
      rationale: `Regional competitors with similar state-level regulatory environment and market conditions.`,
    });
  }

  // Same country competitors
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
      name: `🇮🇳 ${targetLocation.country} National Competitors`,
      competitors: sameCountry.slice(0, 5),
      rationale: `National-level competitors operating across ${targetLocation.country}. Good for understanding larger market trends and best practices.`,
    });
  }

  // Global competitors
  const globalCompetitors = allCompetitors.filter(
    (c) =>
      !sameCity.find((sc) => sc.url === c.url) &&
      !sameState.find((ss) => ss.url === c.url) &&
      !sameCountry.find((snc) => snc.url === c.url)
  );
  if (globalCompetitors.length > 0) {
    categories.push({
      name: "🌍 Global Competitors (International)",
      competitors: globalCompetitors.slice(0, 3),
      rationale: `International competitors for cross-border comparison and innovation benchmarking.`,
    });
  }

  return categories;
}

/**
 * Generate formatted competitor analysis response
 */
export function generateCompetitorAnalysis(
  company: CompanyProfile,
  competitors: BenchmarkSite[]
): CompetitorAnalysisResponse {
  const categories = categorizeCompetitors(competitors, company.location);

  // Get top-tier direct competitors (same city/state if available)
  const directCompetitors = categories
    .filter((c) => c.name.includes("🏢") || c.name.includes("🗺️"))
    .flatMap((c) => c.competitors)
    .slice(0, 3);

  const analysisNotes =
    `
🧠 **${company.name} Competitive Landscape Analysis**

📍 **Primary Location**: ${company.location.city || "N/A"}, ${company.location.state || company.location.country}
🏢 **Company Type**: ${company.type}
👥 **Size**: ${company.companySize}
🎯 **Target Market**: ${company.targetMarket}

**Core Services**:
${company.services.length > 0 ? company.services.map((s) => `  • ${s}`).join("\n") : "  • No clear service list detected from public page text."}

**Key Observations**:
• Competitors are ranked by closest available location match first
• Direct competitors considered: ${directCompetitors.length}
• Competition intensity: ${directCompetitors.length > 1 ? "HIGH" : directCompetitors.length === 1 ? "MEDIUM" : "LOW"}
• Notes are derived from crawled page signals and benchmark records only
  `.trim();

  return {
    targetCompany: company,
    competitorCategories: categories,
    directCompetitors,
    analysisNotes,
  };
}

/**
 * Format the analysis into human-readable markdown
 */
export function formatAnalysisMarkdown(analysis: CompetitorAnalysisResponse): string {
  const lines: string[] = [];

  lines.push(`## ${analysis.targetCompany.name} - Competitor Analysis`);
  lines.push("");

  // Company overview
  lines.push("### 🧠 What They Do");
  lines.push(analysis.targetCompany.description);
  lines.push("");
  lines.push(`📍 **Location**: ${analysis.targetCompany.location.city}, ${analysis.targetCompany.location.state || analysis.targetCompany.location.country}`);
  lines.push(`🏢 **Type**: ${analysis.targetCompany.type}`);
  lines.push(`👥 **Size**: ${analysis.targetCompany.companySize}`);
  lines.push(`🎯 **Target**: ${analysis.targetCompany.targetMarket}`);
  lines.push("");

  // Services
  lines.push("### 💼 Services");
  if (analysis.targetCompany.services.length === 0) {
    lines.push("• Not confidently detected from public page content.");
  } else {
    analysis.targetCompany.services.forEach((s) => {
      lines.push(`• ${s}`);
    });
  }
  lines.push("");

  // Competitor categories
  lines.push("### 🏆 Direct Competitors");
  analysis.competitorCategories.forEach((category) => {
    lines.push(`**${category.name}**`);
    lines.push(category.rationale);
    lines.push("");
    category.competitors.forEach((comp) => {
      const location =
        comp.city || comp.state || comp.country ? ` (${[comp.city, comp.state, comp.country].filter(Boolean).join(", ")})` : "";
      lines.push(
        `• [${comp.name}](${comp.url}) - Overall: ${comp.overall}/100${location}`
      );
    });
    lines.push("");
  });

  lines.push("### 📊 Analysis");
  lines.push(analysis.analysisNotes);

  return lines.join("\n");
}

/**
 * Get formatted competitor analysis response (for API)
 */
export function formatCompetitorResponse(
  url: string,
  location: LocationSignals,
  industry: string,
  competitors: BenchmarkSite[],
  htmlRaw?: string
) {
  const company = buildCompanyProfile(url, location, industry, htmlRaw);
  const analysis = generateCompetitorAnalysis(company, competitors);
  return {
    company: company,
    analysis: analysis,
    markdown: formatAnalysisMarkdown(analysis),
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
