// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { createActionClient } from "../create-action-client";

const LOG_PREFIX = "probe";
const GENERIC_MESSAGE = "Something went wrong.";
const SECRET_INPUT = "secret-password-1";

const client = createActionClient({ logPrefix: LOG_PREFIX, genericMessage: GENERIC_MESSAGE });

const throwingAction = client
  .inputSchema(z.object({ password: z.string() }))
  .action(async ({ parsedInput }) => {
    throw new TypeError(`upstream rejected ${parsedInput.password}`);
  });

const echoAction = client
  .inputSchema(z.object({ name: z.string().min(1) }))
  .action(async ({ parsedInput }) => parsedInput.name);

describe("createActionClient", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // implements FR-9, NFR-3 of add-author-profiles
  it("turns an unexpected throw into the generic message and logs only the error name", async () => {
    const result = await throwingAction({ password: SECRET_INPUT });

    expect(result.serverError).toBe(GENERIC_MESSAGE);
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(`[${LOG_PREFIX}] action failed: TypeError`);
  });

  it("never logs the input", async () => {
    await throwingAction({ password: SECRET_INPUT });

    const logged = vi.mocked(console.error).mock.calls.flat().map(String).join(" ");
    expect(logged).not.toContain(SECRET_INPUT);
  });

  it("returns validation errors in the flattened shape without running the action", async () => {
    const result = await echoAction({ name: "" });

    expect(result.validationErrors?.fieldErrors.name).toHaveLength(1);
    expect(result.data).toBeUndefined();
    expect(console.error).not.toHaveBeenCalled();
  });

  it("returns the action's data on success", async () => {
    const result = await echoAction({ name: "Anna" });

    expect(result.data).toBe("Anna");
  });
});
