// @vitest-environment node
// implements FR-16 of pre-deploy-security-hardening
// A static guard against removal; the refusal itself is verified on the local database.
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const SEED_FILE = "supabase/seed.sql";
const GUARD = "not like '%@example.test'";
const FIRST_WRITE = /^(create|insert|update|delete|alter|drop|truncate)\b/m;

function readSeedStatements(): string {
  const seed = readFileSync(SEED_FILE, "utf8");
  const withoutComments = seed.replace(/^--.*$/gm, "");
  return withoutComments.trim();
}

describe("seed guard", () => {
  const statements = readSeedStatements();

  it("refuses an outside account before the first write", () => {
    const guardAt = statements.indexOf(GUARD);
    const firstWriteAt = statements.search(FIRST_WRITE);

    expect(guardAt).toBeGreaterThan(-1);
    expect(guardAt).toBeLessThan(firstWriteAt);
  });

  it("runs in one transaction, so a runner that goes on past an error writes nothing", () => {
    expect(statements.startsWith("begin;")).toBe(true);
    expect(statements.endsWith("commit;")).toBe(true);
  });
});
