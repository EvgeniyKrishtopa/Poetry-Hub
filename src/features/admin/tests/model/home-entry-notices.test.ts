import { describe, expect, it } from "vitest";

import { ADD_TO_HOME_COPY, ADMIN_HOME_PAGE_COPY } from "../../model/admin-messages";
import { describeAddToHomeResult, describeHomeListResult } from "../../model/home-entry-notices";

describe("describeAddToHomeResult", () => {
  // implements FR-8 of home-page-sections
  it("says «shown on the home page» as a success for an add", () => {
    expect(describeAddToHomeResult({ ok: true, status: "added" }, "poem")).toEqual({
      tone: "success",
      text: ADD_TO_HOME_COPY.added,
    });
  });

  // implements FR-8 of home-page-sections
  it("says «already shown» as a neutral line, for a poem and for an author alike", () => {
    for (const kind of ["poem", "author"] as const) {
      expect(describeAddToHomeResult({ ok: true, status: "already-in-list" }, kind)).toEqual({
        tone: "neutral",
        text: ADD_TO_HOME_COPY.alreadyInList,
      });
    }
  });

  // implements FR-8 of home-page-sections
  it("words the full list for the kind, naming where to remove one", () => {
    const poem = describeAddToHomeResult({ ok: true, status: "limit-reached" }, "poem");
    const author = describeAddToHomeResult({ ok: true, status: "limit-reached" }, "author");

    expect(poem).toEqual({ tone: "neutral", text: ADD_TO_HOME_COPY.limitReached.poem });
    expect(author).toEqual({ tone: "neutral", text: ADD_TO_HOME_COPY.limitReached.author });
    expect(poem.text).toContain("/admin/home");
    expect(author.text).toContain("/admin/home");
    expect(poem.text).not.toBe(author.text);
  });

  // implements FR-8 of home-page-sections
  it("words a missing target for the kind, as a danger line", () => {
    expect(describeAddToHomeResult({ ok: true, status: "not-found" }, "poem")).toEqual({
      tone: "danger",
      text: ADD_TO_HOME_COPY.notFound.poem,
    });
    expect(describeAddToHomeResult({ ok: true, status: "not-found" }, "author")).toEqual({
      tone: "danger",
      text: ADD_TO_HOME_COPY.notFound.author,
    });
  });

  // implements FR-8, FR-13 of home-page-sections
  it("keeps a refused admin check, an ended session and an outage apart", () => {
    const forbidden = describeAddToHomeResult({ ok: false, reason: "forbidden" }, "poem");
    const ended = describeAddToHomeResult({ ok: false, reason: "unauthenticated" }, "poem");
    const outage = describeAddToHomeResult({ ok: false, reason: "unavailable" }, "poem");

    expect(forbidden).toEqual({ tone: "danger", text: ADD_TO_HOME_COPY.forbidden });
    expect(ended).toEqual({ tone: "danger", text: ADD_TO_HOME_COPY.unauthenticated });
    expect(outage).toEqual({ tone: "danger", text: ADD_TO_HOME_COPY.failed });
    expect(new Set([forbidden.text, ended.text, outage.text]).size).toBe(3);
  });
});

describe("describeHomeListResult", () => {
  // implements FR-9 of home-page-sections
  it("says nothing for a move or a remove that was stored", () => {
    expect(describeHomeListResult({ ok: true, status: "moved" })).toBeNull();
    expect(describeHomeListResult({ ok: true, status: "removed" })).toBeNull();
  });

  // implements FR-9 of home-page-sections
  it("tells a stale or missing entry the list changed, as a neutral line", () => {
    const stale = { tone: "neutral", text: ADMIN_HOME_PAGE_COPY.stale };

    expect(describeHomeListResult({ ok: true, status: "stale" })).toEqual(stale);
    expect(describeHomeListResult({ ok: true, status: "not-found" })).toEqual(stale);
  });

  // implements FR-9 of home-page-sections
  it("words a refused admin check, an ended session and an outage as danger lines", () => {
    expect(describeHomeListResult({ ok: false, reason: "forbidden" })).toEqual({
      tone: "danger",
      text: ADD_TO_HOME_COPY.forbidden,
    });
    expect(describeHomeListResult({ ok: false, reason: "unauthenticated" })).toEqual({
      tone: "danger",
      text: ADD_TO_HOME_COPY.unauthenticated,
    });
    expect(describeHomeListResult({ ok: false, reason: "unavailable" })).toEqual({
      tone: "danger",
      text: ADMIN_HOME_PAGE_COPY.moveFailed,
    });
  });
});
