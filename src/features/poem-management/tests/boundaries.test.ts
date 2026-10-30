// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const FEATURE_DIR = "src/features/poem-management";
const ROUTE_DIR = "src/app/(authorized)/account/poems";
const NON_IMPORTING_FEATURES = ["src/features/poems", "src/features/authors", "src/features/auth"];

/** The only client modules of the feature and its routes (NFR-2 of add-poem-creation, as delete-poem modifies it). */
const CLIENT_MODULES = [
  "src/features/poem-management/components/CreatedPoemNotice/CreatedPoemNotice.tsx",
  "src/features/poem-management/components/DeletePoemButton/DeletePoemButton.tsx",
  "src/features/poem-management/components/DeletedPoemNotice/DeletedPoemNotice.tsx",
  "src/features/poem-management/components/NewPoemForm/NewPoemForm.tsx",
];

/** The component files delete-poem adds or changes, searched for colour literals. */
const STYLED_FILES = [
  "src/features/poem-management/components/DeletePoemButton/DeletePoemButton.tsx",
  "src/features/poem-management/components/DeletedPoemNotice/DeletedPoemNotice.tsx",
  "src/features/auth/components/SessionExpiredNotice/SessionExpiredNotice.tsx",
  "src/shared/ui/Alert/Alert.tsx",
  "src/shared/ui/Button/Button.module.css",
  "src/shared/ui/Dialog/Dialog.tsx",
];

const SOURCE_FILE = /\.tsx?$/;
// An arbitrary colour class only: the Dialog's corner glyph keeps its `text-[22px]` size, which is no colour.
const COLOUR_LITERAL = /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(|\b(text|bg|border)-\[(#|rgb|hsl|color|var)/i;

/** Production source files under `dir`; tests are left out, since they name patterns and mock modules. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((path) => SOURCE_FILE.test(path) && !path.split("/").includes("tests"))
    .map((path) => join(dir, path));
}

function filesMatching(files: readonly string[], pattern: RegExp): string[] {
  return files.filter((file) => pattern.test(readFileSync(file, "utf8")));
}

describe("poem-management boundaries", () => {
  // implements NFR-2 of delete-poem
  it("keeps client modules to the form, the created notice, the delete button, and the deleted notice", () => {
    const files = [...sourceFiles(FEATURE_DIR), ...sourceFiles(ROUTE_DIR)];

    expect(filesMatching(files, /^\s*["']use client["']/m).sort()).toEqual(CLIENT_MODULES);
  });

  // implements NFR-3 of delete-poem
  it("is imported by none of poems, authors, and auth", () => {
    const files = NON_IMPORTING_FEATURES.flatMap(sourceFiles);

    expect(filesMatching(files, /["']@\/features\/poem-management(\/[^"']*)?["']/)).toEqual([]);
  });

  // implements FR-1 of delete-poem: no other page offers deleting
  it("renders the delete button only on the owner's poem page", () => {
    const renderers = filesMatching(sourceFiles("src"), /<DeletePoemButton\b/);

    expect(renderers).toEqual(["src/features/poem-management/components/OwnPoemContent/OwnPoemContent.tsx"]);
  });

  // implements NFR-6 of delete-poem
  it("uses no colour literals in the new and changed component files", () => {
    expect(filesMatching(STYLED_FILES, COLOUR_LITERAL)).toEqual([]);
  });
});
