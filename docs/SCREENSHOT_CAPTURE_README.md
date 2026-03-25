# Screenshot Capture Changes (Full-Page + Auto-Scroll)

## Overview
This document explains the screenshot pipeline updates made to improve visual auditing.

Previous behavior captured only the visible viewport and often looked incomplete for long pages.
Current behavior captures the full page height after a warm-up scroll pass.

## What Changed

### 1) Full-page capture enabled
File: `lib/screenshot.ts`

- Desktop screenshot now uses `fullPage: true`.
- Mobile screenshot now uses `fullPage: true`.

This captures the entire rendered page instead of only the first screen.

### 2) Auto-scroll warm-up before capture
File: `lib/screenshot.ts`

- Added `warmupScroll(page)`.
- The browser scrolls down in steps to trigger lazy-loaded sections/images.
- It then scrolls back to top before final capture.

This improves capture quality for pages that render content only after scroll.

### 3) Viewer updated to avoid cropping
File: `components/ScreenshotCard.tsx`

- Replaced fixed-height cropped display with a scrollable preview container.
- Desktop image now uses `h-auto w-full object-contain`.
- Mobile image now uses `h-auto` with a width constraint for readability.

This ensures full-page screenshots are viewable end-to-end in the UI.

### 4) UI copy updated
File: `components/ScreenshotCard.tsx`

- Card description now states:
  "Full-page rendered capture with auto-scroll warm-up for lazy-loaded sections."

## Expected Result

- Website Analysis should show a full-page screenshot, not just the first viewport.
- Long pages should be scrollable inside the screenshot preview card.
- Lazy-loaded sections are more likely to appear in the capture.

## Important Limitation

This is a single full-page snapshot, not a Lighthouse filmstrip timeline.

- Lighthouse filmstrip: sequence of frames during load.
- Current implementation: one final full-page frame after warm-up.

If filmstrip behavior is required, a separate frame-capture pipeline must be added.

## Verification Checklist

1. Run a new audit on a long page.
2. Open Website Analysis and switch Desktop/Mobile tabs.
3. Confirm the image includes lower page sections.
4. Confirm screenshot preview area is scrollable.
5. Confirm no top-only crop is visible.

## Troubleshooting

- If screenshot is missing:
  - Site may block headless automation.
  - Capture may have timed out.
- If image does not load:
  - Data may be corrupted or blocked.
  - Re-run audit and compare desktop/mobile tabs.

## Related Files

- `lib/screenshot.ts`
- `components/ScreenshotCard.tsx`
