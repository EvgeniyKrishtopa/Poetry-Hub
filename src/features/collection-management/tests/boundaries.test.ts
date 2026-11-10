// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const FEATURE_DIR = "src/features/collection-management";
const ROUTE_DIR = "src/app/(authorized)/account/poems/collections";
const TEXT_AREA_FIELD_DIR = "src/shared/ui/TextAreaField";

/** The features that must not import collection-management; the breadcrumbs and the route files may. */
const NON_IMPORTING_FEATURES = [
  "src/features/auth",
  "src/features/authors",
  "src/features/poem-management",
  "src/features/poems",
];

/**
 * The only modules with the client directive: the forms, the button row, the delete and manage buttons, and the
 * two notices. The shared fields, the form hooks, the leave guard, the leave prompts, and the two leave dialogs run on
 * the client through the forms.
 */
const CLIENT_MODULES = [
  "src/features/collection-management/components/CollectionActions/CollectionActions.tsx",
  "src/features/collection-management/components/CollectionListNotice/CollectionListNotice.tsx",
  "src/features/collection-management/components/CollectionPoemsForm/CollectionPoemsForm.tsx",
  "src/features/collection-management/components/DeleteCollectionButton/DeleteCollectionButton.tsx",
  "src/features/collection-management/components/EditCollectionForm/EditCollectionForm.tsx",
  "src/features/collection-management/components/ManageCollectionPoemsButton/ManageCollectionPoemsButton.tsx",
  "src/features/collection-management/components/NewCollectionForm/NewCollectionForm.tsx",
  "src/features/collection-management/components/SavedCollectionNotice/SavedCollectionNotice.tsx",
];

const LEAVE_GUARD_FILE = "src/features/collection-management/hooks/use-leave-guard.ts";

const SOURCE_FILE = /\.tsx?$/;
// The same colour pattern as poem-management's boundaries test: hex, rgb(a), hsl(a), and arbitrary colour classes.
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

describe("collection-management boundaries", () => {
  // implements NFR-2 of add-poem-collections
  // implements NFR-2 of add-poems-to-collections: the collection page's poem list stays a server module
  it("keeps client modules to the forms, the button row, the delete and manage buttons, and the two notices", () => {
    const files = [...sourceFiles(FEATURE_DIR), ...sourceFiles(ROUTE_DIR)];

    expect(filesMatching(files, /^\s*["']use client["']/m).sort()).toEqual(CLIENT_MODULES);
  });

  // implements NFR-3 of add-poem-collections
  it("imports nothing from poems or poem-management", () => {
    const importers = filesMatching(sourceFiles(FEATURE_DIR), /["']@\/features\/(poems|poem-management)(\/[^"']*)?["']/);

    expect(importers).toEqual([]);
  });

  // implements NFR-3 of add-poem-collections
  it("is imported by none of auth, authors, poem-management, and poems", () => {
    const files = NON_IMPORTING_FEATURES.flatMap(sourceFiles);

    expect(filesMatching(files, /["']@\/features\/collection-management(\/[^"']*)?["']/)).toEqual([]);
  });

  // implements NFR-3 of add-poem-collections: the connection is read in shared/ only
  it("reads no navigator.onLine or navigator.connection", () => {
    expect(filesMatching(sourceFiles(FEATURE_DIR), /\bnavigator\.(onLine|connection)\b/)).toEqual([]);
  });

  // implements NFR-3 of add-poem-collections
  // implements NFR-3 of add-poems-to-collections: one guard for the edit and poems pages
  it("listens for beforeunload only in the feature's one leave guard", () => {
    expect(filesMatching(sourceFiles(FEATURE_DIR), /\bbeforeunload\b/)).toEqual([LEAVE_GUARD_FILE]);
  });

  // implements NFR-6 of add-poem-collections
  // implements NFR-6 of add-poems-to-collections: the new pages, list, and dialog included
  it("uses no colour literals in the feature and TextAreaField", () => {
    const files = [...sourceFiles(FEATURE_DIR), ...sourceFiles(TEXT_AREA_FIELD_DIR)];

    expect(filesMatching(files, COLOUR_LITERAL)).toEqual([]);
  });
});
