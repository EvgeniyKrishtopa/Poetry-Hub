// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { removeIllustration } from "../../dal/illustration-cleanup";
import { expectNothingSecretLogged, ILLUSTRATION_PATH } from "../support/rpc-mock";

vi.mock("@/shared/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));

const BUCKET = "poem-illustrations";

class StorageApiError extends Error {
  override name = "StorageApiError";
}

describe("removeIllustration", () => {
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

  // implements FR-8 of admin-moderation
  it("removes the one file from the illustrations bucket with the caller's own session client", async () => {
    await removeIllustration(ILLUSTRATION_PATH);

    expect(from).toHaveBeenCalledExactlyOnceWith(BUCKET);
    expect(remove).toHaveBeenCalledExactlyOnceWith([ILLUSTRATION_PATH]);
    expect(console.error).not.toHaveBeenCalled();
  });

  // implements FR-8, NFR-6 of admin-moderation
  it("logs a Storage error by class and never throws or quotes the path", async () => {
    remove.mockResolvedValue({ data: null, error: new StorageApiError(`object ${ILLUSTRATION_PATH} not found`) });

    await expect(removeIllustration(ILLUSTRATION_PATH)).resolves.toBeUndefined();

    expect(console.error).toHaveBeenCalledExactlyOnceWith("[admin] remove illustration failed: StorageApiError");
    expectNothingSecretLogged();
  });

  // implements FR-8, NFR-6 of admin-moderation
  it("never throws when the call itself throws, and logs the class only", async () => {
    remove.mockRejectedValue(new TypeError(`fetch failed for ${ILLUSTRATION_PATH}`));

    await expect(removeIllustration(ILLUSTRATION_PATH)).resolves.toBeUndefined();

    expect(console.error).toHaveBeenCalledExactlyOnceWith("[admin] remove illustration failed: TypeError");
    expectNothingSecretLogged();
  });

  // implements FR-8 of admin-moderation
  it("never throws when the client can't be built, and adds no line for a missing config", async () => {
    vi.mocked(createSupabaseServerClient).mockRejectedValue(new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]));

    await expect(removeIllustration(ILLUSTRATION_PATH)).resolves.toBeUndefined();

    expect(console.error).not.toHaveBeenCalled();
  });
});
