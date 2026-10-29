// @vitest-environment node
import { describe, expect, it } from "vitest";

import { isUnoptimizableImage } from "../is-unoptimizable-image";

describe("isUnoptimizableImage", () => {
  // implements FR-16 of add-author-profiles
  // implements FR-9 of add-poem-creation
  it.each([
    ["http://127.0.0.1:54321/storage/v1/object/public/author-photos/a/b.jpg", true],
    ["http://127.0.0.1:54321/storage/v1/object/public/poem-illustrations/a/b.png", true],
    ["http://localhost:54321/x.png", true],
    ["blob:http://localhost:3000/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d", true],
    ["blob:https://poetry.example/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d", true],
    ["https://abc.supabase.co/storage/v1/object/public/author-photos/a/b.jpg", false],
    ["https://127.0.0.1.evil.example/x.png", false],
    ["not a url", false],
  ])("%s → %s", (url, expected) => {
    expect(isUnoptimizableImage(url)).toBe(expected);
  });
});
