// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const COMPONENTS_DIR = "src/features/home/components";
const COLOUR_LITERAL = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/;

const stylesheets = readdirSync(COMPONENTS_DIR, { recursive: true, encoding: "utf8" })
  .filter((path) => path.endsWith(".module.css"))
  .map((path) => join(COMPONENTS_DIR, path));

function read(path: string): string {
  return readFileSync(path, "utf8");
}

describe("home styles", () => {
  it("finds the home CSS modules", () => {
    expect(stylesheets.length).toBeGreaterThan(0);
  });

  // implements NFR-4 of home-page-sections
  it.each(stylesheets)("%s holds no raw colour value", (path) => {
    expect(read(path)).not.toMatch(COLOUR_LITERAL);
  });

  // implements NFR-4 of home-page-sections
  it("draws the section headings and the hero title in the serif display font token", () => {
    const headingCss = read(join(COMPONENTS_DIR, "SectionHeading/SectionHeading.module.css"));
    const heroCss = read(join(COMPONENTS_DIR, "HomeHero/HomeHero.module.css"));

    expect(headingCss).toMatch(/\.heading\s*{[^}]*font-family:\s*var\(--font-serif\)/);
    expect(heroCss).toMatch(/\.title\s*{[^}]*font-family:\s*var\(--font-serif\)/);
  });
});

describe("home hero layout and overlay", () => {
  const heroCss = read(join(COMPONENTS_DIR, "HomeHero/HomeHero.module.css"));
  const heroSource = read(join(COMPONENTS_DIR, "HomeHero/HomeHero.tsx"));

  /** The declarations of the first rule for `selector`; `.image` must not match `.image-x`. */
  function ruleBody(selector: string): string {
    const match = heroCss.match(new RegExp(`${selector.replace(".", "\\.")}\\s*{([^}]*)}`));
    if (!match) throw new Error(`HomeHero.module.css: no rule for ${selector}`);
    return match[1];
  }

  // implements FR-B6 of home-contentful-content
  it.each([".title", ".message"])("centres the hero's %s text", (selector) => {
    expect(ruleBody(selector)).toMatch(/text-align:\s*center/);
  });

  // implements FR-B6 of home-contentful-content
  it("centres the hero's content block and its button row", () => {
    expect(heroSource).toMatch(/flex w-full max-w-measure-wide flex-col items-center/);
    expect(heroSource).toMatch(/flex w-full flex-col justify-center[^"]*sm:flex-row/);
  });

  // implements FR-B7 of home-contentful-content
  it("lays the scrim token over the whole hero box", () => {
    const scrim = ruleBody(".scrim");
    expect(scrim).toMatch(/position:\s*absolute/);
    expect(scrim).toMatch(/inset:\s*0/);
    expect(scrim).toMatch(/background:\s*var\(--hero-scrim\)/);
  });

  // implements FR-B7 of home-contentful-content: the order is photo, overlay, text
  it("stacks the photo under the scrim and leaves the text above both", () => {
    const zIndex = (selector: string) => Number(ruleBody(selector).match(/z-index:\s*(-?\d+)/)?.[1]);

    expect(zIndex(".image")).toBeLessThan(zIndex(".scrim"));
    expect(zIndex(".scrim")).toBeLessThan(0);
    expect(ruleBody(".hero")).toMatch(/isolation:\s*isolate/);
  });

  // implements FR-B7 of home-contentful-content: the 10% layer is the only darkening of the photo
  it("applies no other darkening to the photo", () => {
    expect(heroCss).not.toMatch(/filter:|mix-blend-mode|opacity:|linear-gradient|radial-gradient/);
    expect(heroSource).not.toMatch(/brightness|opacity|bg-black|bg-gradient/);
  });
});
