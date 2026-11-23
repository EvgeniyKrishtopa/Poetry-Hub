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
