// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { getPublicAuthorName } from "../../dal/public-author-name";
import { getPublicAuthor } from "../../dal/public-authors";

vi.mock("../../dal/public-authors", () => ({ getPublicAuthor: vi.fn() }));

const ANNA_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";

const ANNA = {
  id: ANNA_ID,
  firstName: "Анна",
  lastName: "Ахматова",
  about: null,
  photoUrl: null,
} as const;

describe("getPublicAuthorName", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // implements FR-4 of add-breadcrumbs
  it("returns the public author's first and last name, read through getPublicAuthor", async () => {
    vi.mocked(getPublicAuthor).mockResolvedValue({ ok: true, author: ANNA });

    await expect(getPublicAuthorName(ANNA_ID)).resolves.toEqual({ ok: true, name: "Анна Ахматова" });
    expect(getPublicAuthor).toHaveBeenCalledWith(ANNA_ID);
  });

  // implements FR-4 of add-breadcrumbs
  it.each(["not-found", "unavailable"] as const)("passes a %s read through unchanged", async (reason) => {
    vi.mocked(getPublicAuthor).mockResolvedValue({ ok: false, reason });

    await expect(getPublicAuthorName(ANNA_ID)).resolves.toEqual({ ok: false, reason });
  });
});
