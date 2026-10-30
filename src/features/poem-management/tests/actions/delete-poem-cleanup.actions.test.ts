// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionState } from "@/features/auth";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { deletePoemAction } from "../../actions/delete-poem.actions";
import { deleteOwnPoem } from "../../dal/poem-delete";

// The real illustration-cleanup helper runs here; only Storage fails. The sibling action test mocks the
// helper, so this file closes the path end to end (Gate 4 CR-06).
vi.mock("next/cache", () => ({ updateTag: vi.fn() }));
vi.mock("@/features/auth", () => ({ getSessionState: vi.fn() }));
vi.mock("@/shared/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock("../../dal/poem-delete", () => ({ deleteOwnPoem: vi.fn() }));

const USER_ID = "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";
const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const POEM_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const ILLUSTRATION_PATH = `${AUTHOR_ID}/0f1e2d3c-4b5a-4968-8776-5a4b3c2d1e0f.png`;

describe("deletePoemAction with the real file cleanup", () => {
  const remove = vi.fn<(paths: string[]) => Promise<{ data: unknown; error: unknown }>>();

  beforeEach(() => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-in", userId: USER_ID });
    vi.mocked(deleteOwnPoem).mockResolvedValue({
      ok: true,
      status: "deleted",
      authorId: AUTHOR_ID,
      illustrationPath: ILLUSTRATION_PATH,
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      storage: { from: () => ({ remove }) },
    } as unknown as SupabaseClient);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // implements FR-3, NFR-5 of delete-poem
  it("answers deleted when Storage rejects the removal, logging the kind only", async () => {
    remove.mockRejectedValueOnce(new TypeError(`fetch failed for ${ILLUSTRATION_PATH}`));

    const result = await deletePoemAction({ poemId: POEM_ID });

    expect(result.data).toEqual({ status: "deleted" });
    expect(remove).toHaveBeenCalledExactlyOnceWith([ILLUSTRATION_PATH]);
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[poem-management] remove illustration failed: TypeError");
  });
});
