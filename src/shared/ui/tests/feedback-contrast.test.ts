// @vitest-environment node
// Reads src/app/globals.css from disk (not an import), so `shared/` still never imports `app/`
// (docs/architecture.md). It lives here because the tokens it guards belong to the shared Alert
// and the feedback tones; moving globals.css means updating CSS_PATH (Gate 1 P1).
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const CSS_PATH = new URL("../../../app/globals.css", import.meta.url);

// WCAG 2.1 AA thresholds.
const TEXT_MIN_RATIO = 4.5;
const NON_TEXT_MIN_RATIO = 3;

type Theme = "light" | "dark";
type Tokens = Record<string, string>;

function readTokens(block: string): Tokens {
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1], m[2]]));
}

function parseThemes(css: string): Record<Theme, Tokens> {
  const light = css.match(/:root\s*{([^}]*)}/);
  const dark = css.match(/prefers-color-scheme:\s*dark\)\s*{\s*:root\s*{([^}]*)}/);
  if (!light || !dark) throw new Error("globals.css: could not find the light and dark :root blocks");
  return { light: readTokens(light[1]), dark: readTokens(dark[1]) };
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.1 contrast ratio between two `#rrggbb` colours. */
function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const themes = parseThemes(readFileSync(CSS_PATH, "utf8"));

// [foreground token, background token, minimum ratio, what it is]
const PAIRS: readonly [string, string, number, string][] = [
  ["danger", "background", TEXT_MIN_RATIO, "danger text on the page"],
  ["success", "background", TEXT_MIN_RATIO, "success text on the page"],
  ["foreground", "surface", TEXT_MIN_RATIO, "alert body text"],
  ["danger", "surface", NON_TEXT_MIN_RATIO, "danger alert border"],
  ["success", "surface", NON_TEXT_MIN_RATIO, "success alert border"],
];

describe("feedback tone contrast", () => {
  // implements NFR-1 of add-feedback-color-tokens: thresholds only; design D1 has the measured values
  describe.each(["light", "dark"] as const)("%s theme", (theme) => {
    it.each(PAIRS)("%s on %s meets %s:1 (%s)", (fg, bg, min) => {
      const tokens = themes[theme];
      expect(tokens[fg], `--${fg} missing`).toBeDefined();
      expect(tokens[bg], `--${bg} missing`).toBeDefined();
      expect(contrastRatio(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(min);
    });
  });
});
