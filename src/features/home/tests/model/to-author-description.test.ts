import { describe, expect, it } from "vitest";

import { AUTHOR_DESCRIPTION_MAX_LENGTH } from "../../model/home.constants";
import { toAuthorDescription } from "../../model/to-author-description";

const ELLIPSIS = "…";

describe("toAuthorDescription", () => {
  // implements FR-4 of home-page-sections
  it("is null when the author has no about text", () => {
    expect(toAuthorDescription(null)).toBeNull();
  });

  // implements FR-4 of home-page-sections
  it("is null when the about text is empty or only whitespace and markup", () => {
    expect(toAuthorDescription("")).toBeNull();
    expect(toAuthorDescription("  \n  ")).toBeNull();
    expect(toAuthorDescription("* * *")).toBeNull();
  });

  // implements FR-4 of home-page-sections
  it("keeps a short text whole", () => {
    expect(toAuthorDescription("Пишу о море.")).toBe("Пишу о море.");
  });

  // implements FR-4 of home-page-sections
  it("turns a long Markdown text into a plain excerpt ending with «…»", () => {
    const about = `# О себе\n\n**Пишу** стихи о *море*, городе и осени. ${"Люблю длинные прогулки по набережной. ".repeat(10)}`;

    const description = toAuthorDescription(about);

    expect(description).not.toBeNull();
    expect(description?.length).toBeLessThanOrEqual(AUTHOR_DESCRIPTION_MAX_LENGTH);
    expect(description?.endsWith(ELLIPSIS)).toBe(true);
    expect(description).not.toMatch(/[#*]/);
    expect(description?.startsWith("О себе Пишу стихи о море")).toBe(true);
  });
});
