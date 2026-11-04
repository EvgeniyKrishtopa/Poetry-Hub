import { describe, expect, it } from "vitest";

import { illustrationChangeOf, isPoemFormChanged, type PoemFormValues } from "../../model/poem-form-values";
import { NO_GENRE } from "../../model/poem-management.constants";

const STORED_URL = "http://127.0.0.1:54321/storage/v1/object/public/poem-illustrations/a/b.png";
const NEW_FILE = new File(["x"], "snow.png", { type: "image/png" });
const NEW_ILLUSTRATION = { kind: "new", draft: { file: NEW_FILE, previewUrl: "blob:preview" } } as const;

const STORED: PoemFormValues = {
  title: "Первый снег",
  text: "строка один\nстрока два",
  genreId: "lyric",
  illustration: { kind: "stored", url: STORED_URL },
};
const WITHOUT_ILLUSTRATION: PoemFormValues = { ...STORED, illustration: { kind: "none" } };

// implements FR-3 of edit-poem
describe("isPoemFormChanged", () => {
  it("is unchanged for the stored values themselves", () => {
    expect(isPoemFormChanged(STORED, { ...STORED })).toBe(false);
  });

  it("is changed by each field on its own", () => {
    expect(isPoemFormChanged(STORED, { ...STORED, title: "Второй снег" })).toBe(true);
    expect(isPoemFormChanged(STORED, { ...STORED, text: "строка один" })).toBe(true);
    expect(isPoemFormChanged(STORED, { ...STORED, genreId: NO_GENRE })).toBe(true);
    expect(isPoemFormChanged(STORED, { ...STORED, illustration: { kind: "none" } })).toBe(true);
  });

  it("stays unchanged when an edit only adds what the schema trims", () => {
    const trimmed = { ...STORED, title: `  ${STORED.title}  `, text: `\n${STORED.text}\n\n  ` };
    expect(isPoemFormChanged(STORED, trimmed)).toBe(false);
  });

  it("stays unchanged once an edit is undone", () => {
    const typed = { ...STORED, title: `${STORED.title}а` };
    expect(isPoemFormChanged(STORED, typed)).toBe(true);
    expect(isPoemFormChanged(STORED, { ...typed, title: STORED.title })).toBe(false);
  });

  it("counts stored → none, stored → new, and none → new as changes, and none → none as none", () => {
    expect(isPoemFormChanged(STORED, WITHOUT_ILLUSTRATION)).toBe(true);
    expect(isPoemFormChanged(STORED, { ...STORED, illustration: NEW_ILLUSTRATION })).toBe(true);
    expect(isPoemFormChanged(WITHOUT_ILLUSTRATION, { ...STORED, illustration: NEW_ILLUSTRATION })).toBe(true);
    expect(isPoemFormChanged(WITHOUT_ILLUSTRATION, { ...WITHOUT_ILLUSTRATION })).toBe(false);
  });
});

describe("illustrationChangeOf", () => {
  // implements FR-4 of edit-poem
  it("keeps a shown stored file, removes for none, and replaces for a new pick", () => {
    expect(illustrationChangeOf({ kind: "stored", url: STORED_URL })).toBe("keep");
    expect(illustrationChangeOf({ kind: "none" })).toBe("remove");
    expect(illustrationChangeOf(NEW_ILLUSTRATION)).toBe("replace");
  });
});
