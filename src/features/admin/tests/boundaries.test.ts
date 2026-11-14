// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const FEATURES_DIR = "src/features";
const ADMIN_DIR = "src/features/admin";
const SHARED_DIR = "src/shared";

const SOURCE_FILE = /\.tsx?$/;
/** The route files (`src/app/`) compose the admin feature; nothing else may import it. */
const IMPORTS_ADMIN = /from ["']@\/features\/admin["']/;
const FEATURE_IMPORT = /from ["']@\/features\/([\w-]+)(?:\/[^"']*)?["']/g;

/** The three components `src/app/` composes (design D12, NFR-4). */
const PUBLIC_API = ["AdminDeleteControl", "AdminNavLink", "AdminPage"];

const ESLINT_TIMEOUT_MS = 60_000;

/** Production source files under `dir`; tests are left out, since they mock modules and name patterns. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((path) => SOURCE_FILE.test(path) && !path.split("/").includes("tests"))
    .map((path) => join(dir, path));
}

function filesMatching(files: readonly string[], pattern: RegExp): string[] {
  return files.filter((file) => pattern.test(readFileSync(file, "utf8")));
}

/** The features a file imports, by name. */
function importedFeatures(files: readonly string[]): string[] {
  const names = new Set<string>();
  for (const file of files) {
    for (const match of readFileSync(file, "utf8").matchAll(FEATURE_IMPORT)) {
      if (match[1] !== undefined) names.add(match[1]);
    }
  }
  return [...names].sort();
}

const adminFiles = sourceFiles(ADMIN_DIR);

/** The rules that fire for `code` as if it sat in `filePath`, through the project's real ESLint config. */
async function restrictedImportMessages(code: string, filePath: string): Promise<string[]> {
  const eslint = new ESLint({ cwd: process.cwd() });
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).filter((message) => message.ruleId === "no-restricted-imports").map((m) => m.message);
}

describe("admin feature boundaries", () => {
  it("finds the feature's source files", () => {
    expect(adminFiles.length).toBeGreaterThan(0);
  });

  // implements NFR-4 of admin-moderation
  it("imports only auth and poems from other features, one way", () => {
    expect(importedFeatures(adminFiles)).toEqual(["auth", "poems"]);
  });

  // implements NFR-4 of admin-moderation
  it("takes nothing from poems but the illustrations bucket constant", () => {
    const poemsImport = /import \{ POEM_ILLUSTRATIONS_BUCKET \} from ["']@\/features\/poems["'];?/g;
    const anyPoemsImport = /from ["']@\/features\/poems["']/;

    const withOtherImport = adminFiles.filter((file) =>
      anyPoemsImport.test(readFileSync(file, "utf8").replace(poemsImport, "")),
    );

    expect(withOtherImport).toEqual([]);
  });

  // implements NFR-4 of admin-moderation
  it("exposes only AdminPage, AdminNavLink and AdminDeleteControl from its index", () => {
    const index = readFileSync(join(ADMIN_DIR, "index.ts"), "utf8");
    const exported = [...index.matchAll(/export \{ (\w+) \}/g)].map((match) => match[1]).sort();

    expect(exported).toEqual(PUBLIC_API);
    expect(index).not.toMatch(/export \*/);
  });

  // implements NFR-4 of admin-moderation
  it("starts every server-side data module with `server-only`", () => {
    const serverModules = adminFiles.filter((file) => file.startsWith(`${ADMIN_DIR}/dal/`));

    expect(serverModules.length).toBeGreaterThan(0);
    expect(serverModules.filter((file) => !/^import "server-only";/m.test(readFileSync(file, "utf8")))).toEqual([]);
  });

  // implements NFR-4 of admin-moderation
  it("keeps every Server Action module to `use server` exports, with its helpers in modules that don't have it", () => {
    const actionModules = adminFiles.filter((file) => file.endsWith(".actions.ts"));

    expect(actionModules.length).toBeGreaterThan(0);
    expect(actionModules.filter((file) => !/^"use server";/.test(readFileSync(file, "utf8")))).toEqual([]);
    const helpers = adminFiles.filter(
      (file) => file.startsWith(`${ADMIN_DIR}/actions/`) && !file.endsWith(".actions.ts"),
    );
    expect(filesMatching(helpers, /^"use server"/m)).toEqual([]);
  });

  // implements NFR-2 of admin-moderation
  it("never reads a service-role or secret Supabase key", () => {
    expect(filesMatching(adminFiles, /SERVICE_ROLE|SECRET_KEY|service_role/i)).toEqual([]);
  });
});

describe("who imports the admin feature", () => {
  const otherFeatureDirs = readdirSync(FEATURES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "admin")
    .map((entry) => join(FEATURES_DIR, entry.name));

  // implements NFR-4 of admin-moderation
  it.each(otherFeatureDirs)("%s never imports it", (dir) => {
    expect(filesMatching(sourceFiles(dir), IMPORTS_ADMIN)).toEqual([]);
  });

  // implements NFR-4 of admin-moderation
  it("shared/ never imports it", () => {
    expect(filesMatching(sourceFiles(SHARED_DIR), IMPORTS_ADMIN)).toEqual([]);
  });
});

describe("the lint boundary", () => {
  // implements NFR-4 of admin-moderation
  it.each([
    ["a feature", "src/features/poems/components/Fixture.tsx"],
    ["shared/", "src/shared/lib/fixture.ts"],
  ])("fails an import of the admin feature from %s", { timeout: ESLINT_TIMEOUT_MS }, async (_case, filePath) => {
    const messages = await restrictedImportMessages(
      'import { AdminDeleteControl } from "@/features/admin";\nexport const used = AdminDeleteControl;\n',
      filePath,
    );

    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain("Only `src/app/` imports the admin feature");
  });

  // implements NFR-4 of admin-moderation
  it("fails an import of an admin internal from another feature, by the public-API rule", { timeout: ESLINT_TIMEOUT_MS }, async () => {
    const messages = await restrictedImportMessages(
      'import { checkIsAdmin } from "@/features/admin/dal/admin-check";\nexport const used = checkIsAdmin;\n',
      "src/features/poems/components/Fixture.tsx",
    );

    // The admin pattern also matches paths under the folder, so both rules speak; the public-API one must be among them.
    expect(messages).toContainEqual(expect.stringContaining("public API"));
  });

  // implements NFR-4 of admin-moderation
  it("lets a route file compose the admin feature", { timeout: ESLINT_TIMEOUT_MS }, async () => {
    const messages = await restrictedImportMessages(
      'import { AdminPage } from "@/features/admin";\nexport default AdminPage;\n',
      "src/app/(authorized)/admin/page.tsx",
    );

    expect(messages).toEqual([]);
  });

  // implements NFR-4 of admin-moderation
  it("still fails a deep import of any feature from inside a feature, so the rewritten rule dropped nothing", { timeout: ESLINT_TIMEOUT_MS }, async () => {
    const messages = await restrictedImportMessages(
      'import { x } from "@/features/auth/model/auth.constants";\nexport const used = x;\n',
      "src/features/poems/components/Fixture.tsx",
    );

    expect(messages).toHaveLength(1);
  });
});
