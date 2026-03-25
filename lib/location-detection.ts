import * as cheerio from "cheerio";
import type { LocationSignals } from "./audit-types";

const TLD_TO_COUNTRY: Record<string, string> = {
  in: "India",
  uk: "United Kingdom",
  us: "United States",
  ca: "Canada",
  au: "Australia",
  de: "Germany",
  fr: "France",
  nl: "Netherlands",
  sg: "Singapore",
  ae: "United Arab Emirates",
};

function clean(v?: string | null): string | undefined {
  const s = String(v || "").replace(/\s+/g, " ").trim();
  return s.length ? s : undefined;
}

function titleCase(v: string): string {
  return v
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function detectCountryFromTld(url: string): string | undefined {
  try {
    const host = new URL(url).hostname.toLowerCase();
    const parts = host.split(".");
    const tld = parts[parts.length - 1];
    return TLD_TO_COUNTRY[tld];
  } catch {
    return undefined;
  }
}

export function detectLocationSignals(htmlRaw: string, pageUrl: string): LocationSignals {
  const $ = cheerio.load(String(htmlRaw || ""));
  const matchedSignals: string[] = [];

  let city: string | undefined;
  let district: string | undefined;
  let state: string | undefined;
  let country: string | undefined;

  // 1) JSON-LD LocalBusiness/Organization address
  const ldBlocks = $('script[type="application/ld+json"]')
    .map((_, el) => $(el).contents().text())
    .get();

  for (const block of ldBlocks) {
    try {
      const json = JSON.parse(block);
      const objects = Array.isArray(json) ? json : [json];
      for (const obj of objects) {
        const address = obj?.address;
        if (address && typeof address === "object") {
          city = city || clean(address.addressLocality);
          state = state || clean(address.addressRegion);
          country = country || clean(address.addressCountry);
          const d = clean(address.addressDistrict || address.district);
          district = district || d;
          if (city || state || country || district) matchedSignals.push("jsonld-address");
        }
      }
    } catch {
      // Ignore invalid JSON-LD blocks
    }
  }

  // 2) Meta hints
  const geoPlace = clean($('meta[name="geo.placename"]').attr("content"));
  const geoRegion = clean($('meta[name="geo.region"]').attr("content"));
  if (geoPlace) {
    const parts = geoPlace.split(",").map((x) => clean(x)).filter(Boolean) as string[];
    if (parts.length >= 1) city = city || parts[0];
    if (parts.length >= 2) state = state || parts[1];
    if (parts.length >= 3) country = country || parts[2];
    matchedSignals.push("meta-geo-placename");
  }
  if (geoRegion && !country) {
    const cc = geoRegion.split("-")[0]?.toUpperCase();
    if (cc === "IN") country = "India";
    if (cc === "US") country = "United States";
    if (cc === "GB") country = "United Kingdom";
    if (country) matchedSignals.push("meta-geo-region");
  }

  // 3) Text parsing from footer/contact sections
  const text = $("footer, address, .contact, [class*='contact'], body").text().replace(/\s+/g, " ");

  if (!district) {
    const dm = text.match(/([A-Za-z ]+)\s+district/i);
    if (dm?.[1]) {
      district = clean(dm[1]);
      if (district) matchedSignals.push("text-district");
    }
  }

  if (!city || !state || !country) {
    const m = text.match(/([A-Za-z ]+),\s*([A-Za-z ]+),\s*(India|United States|United Kingdom|Canada|Australia|Singapore|UAE)/i);
    if (m) {
      city = city || clean(m[1]);
      state = state || clean(m[2]);
      country = country || clean(m[3]);
      matchedSignals.push("text-city-state-country");
    }
  }

  // 4) Fallback from TLD
  if (!country) {
    const tldCountry = detectCountryFromTld(pageUrl);
    if (tldCountry) {
      country = tldCountry;
      matchedSignals.push("tld-country");
    }
  }

  const normalizedCity = city ? titleCase(city) : undefined;
  const normalizedDistrict = district ? titleCase(district) : undefined;
  const normalizedState = state ? titleCase(state) : undefined;
  const normalizedCountry = country ? titleCase(country) : undefined;

  let confidence = 35;
  if (normalizedCountry) confidence += 20;
  if (normalizedState) confidence += 15;
  if (normalizedCity) confidence += 20;
  if (normalizedDistrict) confidence += 10;
  confidence = Math.max(20, Math.min(95, confidence));

  return {
    city: normalizedCity,
    district: normalizedDistrict,
    state: normalizedState,
    country: normalizedCountry,
    confidence,
    matchedSignals: matchedSignals.slice(0, 6),
  };
}
