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
  // implements NFR-6 of delete-poem: the danger button's text (design D7)
  ["on-danger", "danger", TEXT_MIN_RATIO, "danger button text"],
  ["muted", "surface", NON_TEXT_MIN_RATIO, "neutral alert border"],
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

// The home hero's text sits on a photo, so its floor is the scrim over the lightest pixel a hero photo may
// have, not over a flat token. A very light grey: the 50% scrim halves the photo's brightness, so this is the
// lightest photo under the text that still gives white text 4.5:1 (one step lighter fails it).
// `docs/design-system.md` states the same value as the editors' rule.
const LIGHTEST_PHOTO = "#ececec";
const HERO_SCRIM_ALPHA = 0.5;
// Body text is the hero message (under 24 px, regular weight); large text is the h1.
const HERO_BODY_MIN_RATIO = TEXT_MIN_RATIO;
const HERO_LARGE_MIN_RATIO = NON_TEXT_MIN_RATIO;
const RGB_CHANNEL_COUNT = 3;
const BYTE_MAX = 255;

/** The `--hero-scrim: rgb(r g b / alpha)` value of a theme's `:root` block. */
function readScrim(css: string, theme: Theme): { rgb: readonly number[]; alpha: number } {
  const block = theme === "light" ? css.match(/:root\s*{([^}]*)}/) : css.match(/prefers-color-scheme:\s*dark\)\s*{\s*:root\s*{([^}]*)}/);
  const scrim = block?.[1].match(/--hero-scrim:\s*rgb\((\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\d.]+)\)/);
  if (!scrim) throw new Error(`globals.css: could not find --hero-scrim in the ${theme} theme`);
  return { rgb: scrim.slice(1, 1 + RGB_CHANNEL_COUNT).map(Number), alpha: Number(scrim[4]) };
}

/** `#rrggbb` of a colour with `alpha` laid over an opaque `#rrggbb` backdrop. */
function compositeOver(scrim: { rgb: readonly number[]; alpha: number }, backdrop: string): string {
  const channels = [1, 3, 5].map((start, index) => {
    const under = parseInt(backdrop.slice(start, start + 2), 16);
    return Math.min(BYTE_MAX, Math.round(scrim.rgb[index] * scrim.alpha + under * (1 - scrim.alpha)));
  });
  return `#${channels.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

describe("home hero text contrast", () => {
  const css = readFileSync(CSS_PATH, "utf8");

  // implements NFR-B2 of home-contentful-content: white text on the 50% scrim over the lightest allowed photo.
  // This retires home-page-sections NFR-4's higher floors (5.7:1 light, 7:1 dark) on purpose.
  describe.each(["light", "dark"] as const)("%s theme", (theme) => {
    const floorColour = () => {
      const onHero = themes[theme]["on-hero"];
      expect(onHero, "--on-hero missing").toBeDefined();
      return { onHero, floor: compositeOver(readScrim(css, theme), LIGHTEST_PHOTO) };
    };

    it("on-hero over the scrim and the lightest photo meets 4.5:1 for body text", () => {
      const { onHero, floor } = floorColour();
      expect(contrastRatio(onHero, floor)).toBeGreaterThanOrEqual(HERO_BODY_MIN_RATIO);
    });

    it("on-hero over the scrim and the lightest photo meets 3:1 for large text", () => {
      const { onHero, floor } = floorColour();
      expect(contrastRatio(onHero, floor)).toBeGreaterThanOrEqual(HERO_LARGE_MIN_RATIO);
    });
  });

  // implements FR-B7 of home-contentful-content: one uniform black layer at 50% in both themes
  it.each(["light", "dark"] as const)("the %s scrim is black at 50%", (theme) => {
    expect(readScrim(css, theme)).toEqual({ rgb: [0, 0, 0], alpha: HERO_SCRIM_ALPHA });
  });
});

const BUTTON_CSS_PATH = new URL("../Button/Button.module.css", import.meta.url);
const PERCENT = 100;

/** The fill's share in the danger button's hover `color-mix(…, black)`, read from the stylesheet. */
function dangerHoverFillShare(): number {
  const css = readFileSync(BUTTON_CSS_PATH, "utf8");
  const match = css.match(/\.danger:hover\s*{[^}]*color-mix\(in srgb,\s*var\(--color-danger\)\s*(\d+)%,\s*black\)/);
  if (!match) throw new Error("Button.module.css: could not find the danger hover color-mix");
  return Number(match[1]) / PERCENT;
}

/** `color-mix(in srgb, <hex> <share>, black)`: each sRGB channel scaled by the share. */
function mixWithBlack(hex: string, share: number): string {
  const channels = [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * share));
  return `#${channels.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

describe("danger button hover contrast", () => {
  // implements NFR-6 of delete-poem: the hover fill keeps the button text at AA (design D7)
  it.each(["light", "dark"] as const)("on-danger on the %s hover fill meets the text minimum", (theme) => {
    const tokens = themes[theme];
    const hoverFill = mixWithBlack(tokens.danger, dangerHoverFillShare());

    expect(contrastRatio(tokens["on-danger"], hoverFill)).toBeGreaterThanOrEqual(TEXT_MIN_RATIO);
  });
});
