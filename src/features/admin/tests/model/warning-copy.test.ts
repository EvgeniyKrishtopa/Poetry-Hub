import { describe, expect, it } from "vitest";

import { buildWarningEmail } from "../../model/warning-copy";

const ADMIN_MESSAGE = "Пожалуйста, уберите последнее стихотворение.\nСпасибо.";

describe("buildWarningEmail", () => {
  // implements FR-6 of admin-violations-feedback
  it("puts the admin's message first and a fixed block after it", () => {
    const { text } = buildWarningEmail(ADMIN_MESSAGE);

    expect(text.startsWith(ADMIN_MESSAGE)).toBe(true);
    expect(text.length).toBeGreaterThan(ADMIN_MESSAGE.length);
  });

  // implements FR-6 of admin-violations-feedback
  it("states the harmful-content reason and the one-day period in the fixed block", () => {
    const frame = buildWarningEmail(ADMIN_MESSAGE).text.slice(ADMIN_MESSAGE.length);

    expect(frame).toContain("вредоносного контента");
    expect(frame).toContain("один день");
  });

  // implements FR-6 of admin-violations-feedback
  it("has a subject that never holds the admin's text", () => {
    const { subject } = buildWarningEmail(ADMIN_MESSAGE);

    expect(subject).not.toContain("стихотворение");
    expect(subject).not.toMatch(/[\r\n]/);
    expect(buildWarningEmail("другой текст").subject).toBe(subject);
  });

  // implements FR-6 of admin-violations-feedback
  it("does not edit the message", () => {
    expect(buildWarningEmail("  <b>тег</b> & текст  ").text.startsWith("  <b>тег</b> & текст  ")).toBe(true);
  });
});
