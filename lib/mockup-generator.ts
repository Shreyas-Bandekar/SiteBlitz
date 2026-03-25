import * as cheerio from "cheerio";
import { type Issue } from "./audit-types";
import { env } from "./env";

export type MockupJson = {
  companyName: string;
  theme: "saas" | "ecommerce" | "agency" | "corporate";
  header: {
    navLinks: string[];
    ctaText: string;
  };
  hero: {
    badgeText: string;
    headline: string;
    subheadline: string;
    ctaText: string;
    ctaAction: string;
  };
  features: Array<{
    title: string;
    description: string;
    iconName: string; // A Lucide icon name (e.g. 'Zap', 'Shield', 'ShoppingBag', 'TrendingUp', 'Users')
  }>;
  socialProof: {
    quote: string;
    author: string;
    role: string;
  };
  ctaSection: {
    headline: string;
    ctaText: string;
  };
};

export type MockupResult = {
  mockupJson: MockupJson | null;
  error?: string;
  fallbackUsed?: boolean;
};

function extractContextFromHtml(html: string): string {
  const $ = cheerio.load(html || "<html></html>");
  
  // Extract visible textual cues to understand what the business does
  const title = $("title").text().trim();
  const desc = $('meta[name="description"]').attr("content")?.trim() || "";
  
  // Extract headings
  let headings = "";
  $("h1, h2, h3").each((_, el) => {
    headings += $(el).text().replace(/\s+/g, " ").trim() + " | ";
  });

  // Extract buttons/CTAs
  let ctas = "";
  $("a.btn, button").each((_, el) => {
    ctas += $(el).text().replace(/\s+/g, " ").trim() + " | ";
  });

  const context = `
Title: ${title}
Description: ${desc}
Headings: ${headings.slice(0, 300)}
CTAs: ${ctas.slice(0, 200)}
  `.trim();

  return context.slice(0, 1000); // Keep it extremely tight for token limits
}

/**
 * Parses existing HTML for business context, and queries Groq to generate a 
 * highly optimized, clean modern SaaS/Service landing page JSON structure.
 */
export async function generateMockupJson(html: string, issues: Issue[]): Promise<MockupResult> {
  const fallbackJson: MockupJson = {
    companyName: "Acme Corp",
    theme: "saas",
    header: {
      navLinks: ["Features", "Solutions", "Testimonials"],
      ctaText: "Get Started",
    },
    hero: {
      badgeText: "New Optimization Applied",
      headline: "Accelerate Your Business Growth",
      subheadline: "We provide industry-leading solutions optimized for conversion and usability. Discover how we can help you scale.",
      ctaText: "Get Started Now",
      ctaAction: "Contact Sales",
    },
    features: [
      {
        iconName: "Zap",
        title: "Lightning Fast Setup",
        description: "Get up and running in minutes, not weeks, with our intuitive onboarding.",
      },
      {
        iconName: "ShieldCheck",
        title: "Enterprise Security",
        description: "Your data is protected by best-in-class security infrastructure.",
      },
      {
        iconName: "TrendingUp",
        title: "Proven Results",
        description: "Join thousands of successful companies scaling with our platform.",
      },
      {
        iconName: "Users",
        title: "Collaborative Tools",
        description: "Built for teams of all sizes to work together seamlessly.",
      }
    ],
    socialProof: {
      quote: "This platform completely transformed how we engage with our customers and doubled our conversion rate.",
      author: "Sarah Jenkins",
      role: "VP of Digital Marketing",
    },
    ctaSection: {
      headline: "Ready to transform your business?",
      ctaText: "Claim Your Free Trial",
    },
  };

  const apiKey = env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn("[mockup-generator] GROQ_API_KEY missing, using fallback JSON.");
    return { mockupJson: fallbackJson, fallbackUsed: true };
  }

  const businessContext = extractContextFromHtml(html);
  
  // Summarize issues to guide the copywriter AI
  const issueSummary = issues.map(i => i.title).join(", ");

  const prompt = [
    "You are an expert copywriter and Conversion Rate Optimization (CRO) specialist designing a modern, high-converting 10/10 landing page layout.",
    "Below is the extracted context from a target website:",
    `--- Context ---\n${businessContext}\n--- End Context ---`,
    "",
    "Below are the CRO issues detected on their current site:",
    `Issues: ${issueSummary || "General improvement needed"}`,
    "",
    "Your objective: Generate highly persuasive, conversion-optimized copy for a brand new modern landing page layout for this specific business.",
    "1. Deduce the real company name from the Title/Description and set it as `companyName`.",
    "2. Determine the best `theme` (saas, ecommerce, agency, corporate) based on their business model.",
    "3. Set `header.navLinks` to appropriate links for their theme (e.g. Shop, Categories, Cart for ecommerce).",
    "4. Fix the CRO issues by writing compelling, clear, and action-oriented copy for the Hero, Features, and CTA sections.",
    "5. Ensure the tone is professional, premium, and trustworthy. Use exactly 4 features.",
    "6. Use Lucide icon names exactly as they are exported (e.g., 'Target', 'Activity', 'Award', 'CheckCircle', 'Star', 'ShoppingBag', 'ShoppingCart', 'Zap') for the feature icons aligned with their industry.",
    "",
    "You MUST respond ONLY with a raw JSON object matching the exact schema provided. Do NOT wrap it in markdown blockquotes or add any text outside the JSON.",
    "Schema:",
    JSON.stringify(fallbackJson, null, 2),
  ].join("\n");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: env.GROQ_MODEL,
        temperature: 0.2, // Low temp for structured JSON
        max_tokens: 800,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You are a JSON generator. You must return ONLY raw valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
        throw new Error(`Groq API Error: ${response.status}`);
    }

    const payload = await response.json();
    const content = payload.choices?.[0]?.message?.content?.trim() || "";
    
    // Attempt parse
    const parsed = JSON.parse(content) as MockupJson;
    
    // Very basic validation
    if (!parsed.hero?.headline || !parsed.features?.length) {
      throw new Error("Invalid schema generated.");
    }

    return { mockupJson: parsed, fallbackUsed: false };
  } catch (error) {
    console.warn("[mockup-generator] Failed to generate JSON from Groq:", error instanceof Error ? error.message : String(error));
    // Provide the beautifully formatted generic fallback if AI fails (e.g., rate limits)
    return { mockupJson: fallbackJson, fallbackUsed: true, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timeoutId);
  }
}
