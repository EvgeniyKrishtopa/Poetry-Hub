// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { listUsers } from "../../dal/user-list";
import { ADMIN_USERS_PAGE_SIZE } from "../../model/admin.constants";
import {
  expectNothingSecretLogged,
  HTTP_FORBIDDEN,
  HTTP_UNAVAILABLE,
  ok,
  rpcError,
  TARGET_EMAIL,
  TARGET_USER_ID,
  type RpcResponse,
} from "../support/rpc-mock";

vi.mock("@/shared/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));

const CREATED_AT = "2026-11-13T17:15:29.123456+00:00";
const SIGNED_IN_AT = "2026-11-14T08:00:00.5+00:00";

/** The id of the n-th fake user, newest first: distinct and valid. */
function userId(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

/** The n-th row `admin_list_users` returns; older with a bigger n. */
function row(n: number, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: userId(n),
    user_email: `user${n}@example.com`,
    author_name: null,
    created_at: `2026-11-13T17:15:${String(59 - n).padStart(2, "0")}.123456+00:00`,
    last_sign_in_at: null,
    restriction: null,
    is_admin: false,
    ...overrides,
  };
}

function rows(count: number): Record<string, unknown>[] {
  return Array.from({ length: count }, (_value, index) => row(index));
}

describe("listUsers", () => {
  let rpc: ReturnType<typeof vi.fn<(fn: string, args?: unknown) => Promise<RpcResponse>>>;

  beforeEach(() => {
    rpc = vi.fn<(fn: string, args?: unknown) => Promise<RpcResponse>>();
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc } as unknown as SupabaseClient);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // implements FR-3 of admin-moderation
  it("asks for one row more than a page, with no cursor and no filter on the first page", async () => {
    rpc.mockResolvedValue(ok([]));

    await listUsers({});

    expect(rpc).toHaveBeenCalledExactlyOnceWith("admin_list_users", {
      page_size: ADMIN_USERS_PAGE_SIZE + 1,
      after_created_at: null,
      after_id: null,
      email: null,
    });
  });

  // implements FR-3 of admin-moderation
  it("sends the cursor's two halves and the address as typed", async () => {
    rpc.mockResolvedValue(ok([]));

    await listUsers({ after: `${CREATED_AT}_${TARGET_USER_ID}`, email: ` ${TARGET_EMAIL.toUpperCase()} ` });

    expect(rpc).toHaveBeenCalledExactlyOnceWith("admin_list_users", {
      page_size: ADMIN_USERS_PAGE_SIZE + 1,
      after_created_at: CREATED_AT,
      after_id: TARGET_USER_ID,
      email: ` ${TARGET_EMAIL.toUpperCase()} `,
    });
  });

  // implements FR-3 of admin-moderation
  it("treats a hand-edited cursor as the first page and sends no half of it", async () => {
    rpc.mockResolvedValue(ok([]));

    await listUsers({ after: "garbage" });

    expect(rpc).toHaveBeenCalledExactlyOnceWith("admin_list_users", {
      page_size: ADMIN_USERS_PAGE_SIZE + 1,
      after_created_at: null,
      after_id: null,
      email: null,
    });
  });

  // implements FR-3 of admin-moderation
  it("shows every column the page needs, with the database's address column renamed", async () => {
    rpc.mockResolvedValue(
      ok([
        row(1, {
          author_name: "Ада Лавлейс",
          created_at: CREATED_AT,
          last_sign_in_at: SIGNED_IN_AT,
          restriction: "blocked",
          is_admin: true,
        }),
      ]),
    );

    await expect(listUsers({})).resolves.toEqual({
      ok: true,
      users: [
        {
          id: userId(1),
          email: "user1@example.com",
          authorName: "Ада Лавлейс",
          createdAt: CREATED_AT,
          lastSignInAt: SIGNED_IN_AT,
          restriction: "blocked",
          isAdmin: true,
        },
      ],
      nextCursor: null,
    });
  });

  // implements FR-3 of admin-moderation
  it("shows a page of rows and no next cursor when the database had no extra row", async () => {
    rpc.mockResolvedValue(ok(rows(ADMIN_USERS_PAGE_SIZE)));

    const result = await listUsers({});

    expect(result).toMatchObject({ ok: true, nextCursor: null });
    expect(result.ok && result.users).toHaveLength(ADMIN_USERS_PAGE_SIZE);
  });

  // implements FR-3 of admin-moderation
  it("drops the extra row and continues after the last row shown", async () => {
    const all = rows(ADMIN_USERS_PAGE_SIZE + 1);
    rpc.mockResolvedValue(ok(all));

    const result = await listUsers({});

    expect(result.ok && result.users).toHaveLength(ADMIN_USERS_PAGE_SIZE);
    const lastShown = all[ADMIN_USERS_PAGE_SIZE - 1];
    expect(result).toMatchObject({
      ok: true,
      nextCursor: `${String(lastShown?.created_at)}_${String(lastShown?.id)}`,
    });
    expect(result.ok && result.users.map((user) => user.id)).not.toContain(userId(ADMIN_USERS_PAGE_SIZE));
  });

  // implements FR-3 of admin-moderation
  it("is an empty page with no cursor when nobody matches", async () => {
    rpc.mockResolvedValue(ok([]));

    await expect(listUsers({ email: TARGET_EMAIL })).resolves.toEqual({ ok: true, users: [], nextCursor: null });
  });

  // implements FR-2, FR-3 of admin-moderation
  it.each([
    ["an outage", rpcError("XX000", HTTP_UNAVAILABLE), "unavailable"],
    ["a refused admin check", rpcError("42501", HTTP_FORBIDDEN), "forbidden"],
  ] as const)("is a failure, with no rows, for %s", async (_case, response, failure) => {
    rpc.mockResolvedValue(response);

    await expect(listUsers({ email: TARGET_EMAIL })).resolves.toEqual({ ok: false, failure });
    expectNothingSecretLogged();
  });

  // implements FR-3 of admin-moderation
  it.each([
    ["an unknown restriction", [row(1, { restriction: "suspended" })]],
    ["a row without an address", [row(1, { user_email: undefined })]],
    ["a timestamp without an offset", [row(1, { created_at: "2026-11-13T17:15:29" })]],
    ["not an array", { rows: [] }],
  ])("is unknown, never a guessed page, for %s", async (_case, data) => {
    rpc.mockResolvedValue(ok(data));

    await expect(listUsers({})).resolves.toEqual({ ok: false, failure: "unknown" });
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[admin] list users failed: ZodError");
  });

  // implements NFR-6 of admin-moderation
  it("never logs the filter address", async () => {
    rpc.mockRejectedValue(new TypeError(`fetch failed for ${TARGET_EMAIL}`));

    await listUsers({ email: TARGET_EMAIL });

    expect(console.error).toHaveBeenCalledExactlyOnceWith("[admin] list users failed: TypeError");
    expectNothingSecretLogged();
  });
});
