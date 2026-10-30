// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { removeIllustrationBestEffort } from "../../dal/illustration-cleanup";

vi.mock("@/shared/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));

const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const ILLUSTRATION_PATH = `${AUTHOR_ID}/0f1e2d3c-4b5a-4968-8776-5a4b3c2d1e0f.png`;
const BUCKET = "poem-illustrations";

class StorageApiError extends Error {
  override name = "StorageApiError";
}

describe("removeIllustrationBestEffort", () => {
  const remove = vi.fn<(paths: string[]) => Promise<{ data: unknown; error: unknown }>>();
  const from = vi.fn(() => ({ remove }));

  beforeEach(() => {
    remove.mockResolvedValue({ data: [], error: null });
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ storage: { from } } as unknown as SupabaseClient);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  function logged(): string {
    return vi.mocked(console.error).mock.calls.flat().join("\n");
  }

  it("removes the one file from the illustrations bucket", async () => {
    await removeIllustrationBestEffort(ILLUSTRATION_PATH);

    expect(from).toHaveBeenCalledExactlyOnceWith(BUCKET);
    expect(remove).toHaveBeenCalledExactlyOnceWith([ILLUSTRATION_PATH]);
    expect(console.error).not.toHaveBeenCalled();
  });

  // implements NFR-5 of delete-poem
  it("logs a returned Storage error by kind only, without the path", async () => {
    remove.mockResolvedValue({ data: null, error: new StorageApiError(`Object not found: ${ILLUSTRATION_PATH}`) });

    await expect(removeIllustrationBestEffort(ILLUSTRATION_PATH)).resolves.toBeUndefined();

    expect(console.error).toHaveBeenCalledExactlyOnceWith("[poem-management] remove illustration failed: StorageApiError");
    expect(logged()).not.toContain(AUTHOR_ID);
  });

  // implements NFR-5 of delete-poem
  it("swallows a thrown failure and logs it by kind only", async () => {
    remove.mockRejectedValue(new TypeError(`fetch failed for ${ILLUSTRATION_PATH}`));

    await expect(removeIllustrationBestEffort(ILLUSTRATION_PATH)).resolves.toBeUndefined();

    expect(console.error).toHaveBeenCalledExactlyOnceWith("[poem-management] remove illustration failed: TypeError");
  });

  it("stays silent when Supabase isn't configured", async () => {
    vi.mocked(createSupabaseServerClient).mockRejectedValue(new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]));

    await expect(removeIllustrationBestEffort(ILLUSTRATION_PATH)).resolves.toBeUndefined();

    expect(remove).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });
});
