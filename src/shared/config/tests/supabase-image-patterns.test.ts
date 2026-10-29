// @vitest-environment node
import { describe, expect, it } from "vitest";

import { buildSupabaseImagePatterns } from "../supabase-image-patterns";

describe("buildSupabaseImagePatterns", () => {
  // implements FR-16, NFR-6 of add-author-profiles
  // implements FR-9 of add-poem-creation
  it("allows only the author-photos and poem-illustrations public paths on the Supabase host", () => {
    expect(buildSupabaseImagePatterns("https://abc.supabase.co").map((pattern) => pattern.href)).toEqual([
      "https://abc.supabase.co/storage/v1/object/public/author-photos/**",
      "https://abc.supabase.co/storage/v1/object/public/poem-illustrations/**",
    ]);
  });

  it("keeps a local stack's port", () => {
    const [pattern] = buildSupabaseImagePatterns("http://127.0.0.1:54321");

    expect(pattern.host).toBe("127.0.0.1:54321");
  });

  it.each([
    ["unset", undefined],
    ["empty", ""],
    ["not a URL", "not a url"],
  ])("returns no pattern when the URL is %s, so the build still succeeds", (_case, url) => {
    expect(buildSupabaseImagePatterns(url)).toEqual([]);
  });
});
