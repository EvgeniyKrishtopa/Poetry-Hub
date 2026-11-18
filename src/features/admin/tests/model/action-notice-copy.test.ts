import { describe, expect, it } from "vitest";

import { buildActionNoticeEmail } from "../../model/action-notice-copy";
import { ACTION_NOTICE_KIND } from "../../model/violation.constants";
import type { ActionNoticeContent } from "../../model/violation.types";

const TITLE_WITH_BREAK = "Первая строка\nВторая строка";

const KINDS = [
  ACTION_NOTICE_KIND.block,
  ACTION_NOTICE_KIND.ban,
  ACTION_NOTICE_KIND.deletePoem,
  ACTION_NOTICE_KIND.deleteCollection,
] as const;

function content(overrides: Partial<ActionNoticeContent>): ActionNoticeContent {
  return { kind: ACTION_NOTICE_KIND.block, ground: null, title: null, ...overrides };
}

describe("buildActionNoticeEmail", () => {
  // implements FR-9 of admin-violations-feedback
  it("gives each kind its own subject", () => {
    const subjects = KINDS.map((kind) => buildActionNoticeEmail(content({ kind, title: "T" })).subject);

    expect(new Set(subjects).size).toBe(KINDS.length);
  });

  // implements FR-9 of admin-violations-feedback
  it.each(KINDS)("keeps a title with a line break out of the %s subject and out of every header", (kind) => {
    const { subject } = buildActionNoticeEmail(content({ kind, title: TITLE_WITH_BREAK }));

    expect(subject).not.toContain("Первая");
    expect(subject).not.toMatch(/[\r\n]/);
  });

  // implements FR-9 of admin-violations-feedback
  it("names a deleted poem by its title in the body, as plain text", () => {
    const { text } = buildActionNoticeEmail(content({ kind: ACTION_NOTICE_KIND.deletePoem, title: TITLE_WITH_BREAK }));

    expect(text).toContain(`«${TITLE_WITH_BREAK}»`);
    expect(text).toContain("произведение");
  });

  // implements FR-9 of admin-violations-feedback
  it("names a deleted collection by its title in the body", () => {
    const { text } = buildActionNoticeEmail(content({ kind: ACTION_NOTICE_KIND.deleteCollection, title: "Осень" }));

    expect(text).toContain("«Осень»");
    expect(text).toContain("сборник");
  });

  // implements FR-9 of admin-violations-feedback
  it.each([ACTION_NOTICE_KIND.deletePoem, ACTION_NOTICE_KIND.deleteCollection])(
    "does not print 'null' for a %s with no title",
    (kind) => {
      expect(buildActionNoticeEmail(content({ kind, title: null })).text).not.toContain("null");
    },
  );

  // implements FR-9 of admin-violations-feedback
  it("says a block and a ban in the body, with no title", () => {
    expect(buildActionNoticeEmail(content({ kind: ACTION_NOTICE_KIND.block })).text).toContain("заблокирован");
    expect(buildActionNoticeEmail(content({ kind: ACTION_NOTICE_KIND.ban })).text).toContain("забанен");
  });

  // implements FR-9 of admin-violations-feedback
  it("states the ground's reason, a different one per ground", () => {
    const harmful = buildActionNoticeEmail(content({ ground: "harmful-content" })).text;
    const malicious = buildActionNoticeEmail(content({ ground: "malicious-activity" })).text;

    expect(harmful).toContain("вредоносного контента");
    expect(malicious).toContain("вредоносная активность");
    expect(harmful).not.toBe(malicious);
  });

  // implements FR-9 of admin-violations-feedback
  it("gives a general reason when the user has no open case", () => {
    const { text } = buildActionNoticeEmail(content({ ground: null }));

    expect(text).toContain("нарушение правил сайта");
    expect(text).not.toContain("null");
  });
});
