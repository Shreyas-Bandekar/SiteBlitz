import { Page } from "playwright";
import * as cheerio from "cheerio";

export async function analyzeUIUX(html: string, page: Page | null) {
  const issues: string[] = [];
  let penalties = 0;

  if (page) {
    // Typography: Flag fonts <14px
    const tinyFontsCount = Number(await page.evaluate(`(() => {
      const all = document.querySelectorAll("*");
      let count = 0;
      for (const el of all) {
        if (el.children.length === 0 && el.textContent && el.textContent.trim()) {
          const style = window.getComputedStyle(el);
          const fontSize = parseFloat(style.fontSize);
          if (fontSize < 14) count++;
        }
      }
      return count;
    })()`));

    if (tinyFontsCount > 5) {
      issues.push("Typography: 5+ tiny fonts (<14px) detected");
      penalties += 5;
    }

    // Contrast: Sample 10 text/bg pairs
    const avgContrast = Number(await page.evaluate(`(() => {
      function getLuminance(r, g, b) {
        const arr = [r, g, b].map((v) => {
          const x = v / 255;
          return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * arr[0] + 0.7152 * arr[1] + 0.0722 * arr[2];
      }

      function getContrast(rgb1, rgb2) {
        const l1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]) + 0.05;
        const l2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]) + 0.05;
        return l1 > l2 ? l1 / l2 : l2 / l1;
      }

      function parseRGB(str) {
        const match = String(str || "").match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
        return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : [0, 0, 0];
      }

      const elements = Array.from(document.querySelectorAll("p, span, h1, h2, h3, h4, h5, h6, a, button, li"));
      const samples = elements.filter((el) => ((el.textContent || "").trim().length > 10)).slice(0, 10);
      if (samples.length === 0) return 4.5;

      let totalContrast = 0;
      samples.forEach((el) => {
        const style = window.getComputedStyle(el);
        const color = parseRGB(style.color);
        let bgColor = parseRGB(style.backgroundColor);
        let curr = el;
        let currStyle = style;

        while ((currStyle.backgroundColor === "transparent" || currStyle.backgroundColor === "rgba(0, 0, 0, 0)") && curr && curr.parentElement) {
          curr = curr.parentElement;
          currStyle = window.getComputedStyle(curr);
          bgColor = parseRGB(currStyle.backgroundColor);
        }

        if (currStyle.backgroundColor === "transparent" || currStyle.backgroundColor === "rgba(0, 0, 0, 0)") {
          bgColor = [255, 255, 255];
        }

        totalContrast += getContrast(color, bgColor);
      });
      return totalContrast / samples.length;
    })()`));

    if (avgContrast < 4.5) {
      issues.push(`Contrast: Average contrast ratio is ${avgContrast.toFixed(1)}:1 (below 4.5:1)`);
      penalties += 10;
    }
  }

  // Navigation: Flag deep menus >3 levels or too complex
  const $ = cheerio.load(html);
  const navDepth = $("nav").find("*").length;

  if (navDepth > 10) {
    issues.push("Navigation: Menu structure is too complex (>10 items)");
    penalties += 8;
  }

  return {
    uxScore: Math.max(0, 100 - penalties),
    issues,
  };
}
