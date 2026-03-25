export type AuditCategory =
  | "uiux"
  | "perf"
  | "mobile"
  | "access"
  | "seo"
  | "leads";

export const AUDIT_PROMPTS: Record<AuditCategory, string> = {
  uiux: "Check visual hierarchy, contrast, CTA clarity, navigation depth, and trust signals.",
  perf: "Evaluate load speed, Core Web Vitals hints, render-blocking resources, and responsiveness.",
  mobile:
    "Check viewport settings, touch target spacing, mobile readability, and sticky CTA behavior.",
  access:
    "Check alt text coverage, ARIA attributes, semantic landmarks, heading order, and keyboard hints.",
  seo: "Check title/meta quality, heading structure, canonical hints, structured data hints, and internal linking.",
  leads:
    "Check lead capture opportunities: forms, CTA buttons, contact links, social proof, and funnel clarity.",
};

export const COLOR_PSYCHOLOGY_TIPS = [
  "Use high-contrast CTA colors (blue/orange) for conversion-focused actions.",
  "Reduce saturated background blocks around forms to lower cognitive load.",
  "Keep trust elements in calmer palettes near pricing and lead forms.",
];
