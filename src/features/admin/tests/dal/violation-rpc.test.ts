// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import {
  addViolationCase,
  addViolationCaseForAuthor,
  listViolationCases,
  logNotice,
  markWarned,
  removeViolationCase,
  setCaseGround,
  startWarning,
} from "../../dal/violation-rpc";
import { VIOLATION_LIST_LIMIT } from "../../model/violation.constants";
import {
  AUTHOR_PROFILE_ID,
  CASE_ID,
  COLLECTION_ID,
  expectNothingSecretLogged,
  HTTP_FORBIDDEN,
  HTTP_UNAUTHORIZED,
  HTTP_UNAVAILABLE,
  NO_RESPONSE,
  ok,
  POEM_ID,
  POEM_TITLE,
  rpcError,
  TARGET_EMAIL,
  TARGET_USER_ID,
  type RpcResponse,
} from "../support/rpc-mock";

vi.mock("@/shared/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));

type RpcMock = ReturnType<typeof vi.fn<(fn: string, args?: unknown) => Promise<RpcResponse>>>;

function row(index: number, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    user_id: TARGET_USER_ID,
    user_email: TARGET_EMAIL,
    author_name: "Ада Лавлейс",
    author_profile_id: AUTHOR_PROFILE_ID,
    ground: "harmful-content",
    content_kind: "poem",
    content_id: POEM_ID,
    content_title: POEM_TITLE,
    created_at: "2026-11-17T10:00:00+00:00",
    warned_at: null,
    ...overrides,
  };
}

const ADD_INPUT = { userId: TARGET_USER_ID, ground: "harmful-content", content: { kind: "poem", id: POEM_ID } } as const;

describe("violation-rpc", () => {
  let rpc: RpcMock;

  beforeEach(() => {
    rpc = vi.fn<(fn: string, args?: unknown) => Promise<RpcResponse>>();
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc } as unknown as SupabaseClient);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("addViolationCase", () => {
    // implements FR-1 of admin-violations-feedback
    it("sends the user, the ground and the content, and reads the answer", async () => {
      rpc.mockResolvedValue(ok({ status: "added" }));

      await expect(addViolationCase(ADD_INPUT)).resolves.toEqual({ ok: true, status: "added" });
      expect(rpc).toHaveBeenCalledExactlyOnceWith("admin_add_violation_case", {
        target_user_id: TARGET_USER_ID,
        ground: "harmful-content",
        content_kind: "poem",
        content_id: POEM_ID,
      });
    });

    // implements FR-1 of admin-violations-feedback
    it("sends two nulls when no content prompted the case", async () => {
      rpc.mockResolvedValue(ok({ status: "added" }));

      await addViolationCase({ userId: TARGET_USER_ID, ground: "malicious-activity" });

      expect(rpc).toHaveBeenCalledExactlyOnceWith("admin_add_violation_case", {
        target_user_id: TARGET_USER_ID,
        ground: "malicious-activity",
        content_kind: null,
        content_id: null,
      });
    });

    // implements FR-1, FR-15 of admin-violations-feedback
    it.each(["added", "already-in-list", "target-is-admin", "already-restricted", "not-found", "content-not-found"])(
      "returns the answer %s",
      async (status) => {
        rpc.mockResolvedValue(ok({ status }));

        await expect(addViolationCase(ADD_INPUT)).resolves.toEqual({ ok: true, status });
        expect(console.error).not.toHaveBeenCalled();
      },
    );
  });

  describe("addViolationCaseForAuthor", () => {
    // implements FR-2 of admin-violations-feedback
    it("sends the profile id and the collection that prompted the case", async () => {
      rpc.mockResolvedValue(ok({ status: "already-in-list" }));

      await expect(
        addViolationCaseForAuthor({
          authorProfileId: AUTHOR_PROFILE_ID,
          ground: "harmful-content",
          content: { kind: "collection", id: COLLECTION_ID },
        }),
      ).resolves.toEqual({ ok: true, status: "already-in-list" });
      expect(rpc).toHaveBeenCalledExactlyOnceWith("admin_add_violation_case_for_author", {
        author_profile_id: AUTHOR_PROFILE_ID,
        ground: "harmful-content",
        content_kind: "collection",
        content_id: COLLECTION_ID,
      });
    });
  });

  describe("listViolationCases", () => {
    // implements FR-4 of admin-violations-feedback
    it("maps a row to a case, with the recorded content and the warning time", async () => {
      rpc.mockResolvedValue(ok([row(1, { warned_at: "2026-11-17T12:00:00+00:00" })]));

      await expect(listViolationCases()).resolves.toEqual({
        ok: true,
        capReached: false,
        cases: [
          {
            id: "00000000-0000-4000-8000-000000000001",
            userId: TARGET_USER_ID,
            email: TARGET_EMAIL,
            authorName: "Ада Лавлейс",
            authorProfileId: AUTHOR_PROFILE_ID,
            ground: "harmful-content",
            content: { kind: "poem", id: POEM_ID, title: POEM_TITLE },
            createdAt: "2026-11-17T10:00:00+00:00",
            warnedAt: "2026-11-17T12:00:00+00:00",
          },
        ],
      });
      expect(rpc).toHaveBeenCalledExactlyOnceWith("admin_list_violation_cases", {});
    });

    // implements FR-4 of admin-violations-feedback
    it("maps a case with no recorded content and no author profile to nulls", async () => {
      rpc.mockResolvedValue(
        ok([
          row(1, {
            author_name: null,
            author_profile_id: null,
            content_kind: null,
            content_id: null,
            content_title: null,
          }),
        ]),
      );

      const result = await listViolationCases();

      expect(result).toMatchObject({
        ok: true,
        cases: [{ authorName: null, authorProfileId: null, content: null }],
      });
    });

    // implements FR-4 of admin-violations-feedback
    it("keeps a null title for content that was deleted since", async () => {
      rpc.mockResolvedValue(ok([row(1, { content_title: null })]));

      await expect(listViolationCases()).resolves.toMatchObject({
        cases: [{ content: { kind: "poem", id: POEM_ID, title: null } }],
      });
    });

    // implements FR-4 of admin-violations-feedback
    it("keeps the order the database gave", async () => {
      rpc.mockResolvedValue(ok([row(3), row(2), row(1)]));

      const result = await listViolationCases();

      expect(result.ok && result.cases.map((entry) => entry.id.slice(-1))).toEqual(["3", "2", "1"]);
    });

    // implements FR-4 of admin-violations-feedback
    it("is an empty list, not a failure, when there is no open case", async () => {
      rpc.mockResolvedValue(ok([]));

      await expect(listViolationCases()).resolves.toEqual({ ok: true, cases: [], capReached: false });
    });

    // implements FR-4 of admin-violations-feedback
    it("shows exactly the cap and does not say more exist when the database gave exactly the cap", async () => {
      rpc.mockResolvedValue(ok(Array.from({ length: VIOLATION_LIST_LIMIT }, (_unused, index) => row(index + 1))));

      const result = await listViolationCases();

      expect(result.ok && result.cases).toHaveLength(VIOLATION_LIST_LIMIT);
      expect(result).toMatchObject({ capReached: false });
    });

    // implements FR-4 of admin-violations-feedback
    it("trims the extra row the database reads and says more exist", async () => {
      rpc.mockResolvedValue(ok(Array.from({ length: VIOLATION_LIST_LIMIT + 1 }, (_unused, index) => row(index + 1))));

      const result = await listViolationCases();

      expect(result.ok && result.cases).toHaveLength(VIOLATION_LIST_LIMIT);
      expect(result).toMatchObject({ capReached: true });
    });

    // implements FR-4 of admin-violations-feedback
    it.each([
      ["a ground outside the list", [row(1, { ground: "spam" })]],
      ["a content kind with no content id", [row(1, { content_id: null })]],
      ["a content id with no content kind", [row(1, { content_kind: null })]],
      ["a non-uuid user id", [row(1, { user_id: "x" })]],
      ["a row that is not an object", ["x"]],
      ["no data", null],
    ])("is unknown, never a guessed list, for %s", async (_case, data) => {
      rpc.mockResolvedValue(ok(data));

      await expect(listViolationCases()).resolves.toEqual({ ok: false, failure: "unknown" });
      expect(console.error).toHaveBeenCalledExactlyOnceWith("[admin] list violation cases failed: ZodError");
      expectNothingSecretLogged();
    });
  });

  describe("setCaseGround", () => {
    // implements FR-7 of admin-violations-feedback
    it.each(["ground-changed", "not-found"])("sends the case and the ground and returns the answer %s", async (status) => {
      rpc.mockResolvedValue(ok({ status }));

      await expect(setCaseGround({ caseId: CASE_ID, ground: "malicious-activity" })).resolves.toEqual({
        ok: true,
        status,
      });
      expect(rpc).toHaveBeenCalledExactlyOnceWith("admin_set_case_ground", {
        case_id: CASE_ID,
        ground: "malicious-activity",
      });
    });
  });

  describe("removeViolationCase", () => {
    // implements FR-7 of admin-violations-feedback
    it.each(["removed", "not-found"])("sends the case id only and returns the answer %s", async (status) => {
      rpc.mockResolvedValue(ok({ status }));

      await expect(removeViolationCase({ caseId: CASE_ID })).resolves.toEqual({ ok: true, status });
      expect(rpc).toHaveBeenCalledExactlyOnceWith("admin_remove_violation_case", { case_id: CASE_ID });
    });
  });

  describe("startWarning", () => {
    // implements FR-6 of admin-violations-feedback
    it("returns the address to send to when the case is ready", async () => {
      rpc.mockResolvedValue(ok({ status: "ready", email: TARGET_EMAIL }));

      await expect(startWarning({ caseId: CASE_ID })).resolves.toEqual({
        ok: true,
        status: "ready",
        email: TARGET_EMAIL,
      });
      expect(rpc).toHaveBeenCalledExactlyOnceWith("admin_start_warning", { case_id: CASE_ID });
    });

    // implements FR-6 of admin-violations-feedback
    it.each(["not-found", "wrong-ground", "already-warned", "already-restricted", "no-address"])(
      "returns the refusal %s with no address",
      async (status) => {
        rpc.mockResolvedValue(ok({ status }));

        await expect(startWarning({ caseId: CASE_ID })).resolves.toEqual({ ok: true, status });
      },
    );

    // implements FR-6 of admin-violations-feedback
    it.each([
      ["ready with no address", { status: "ready" }],
      ["ready with an empty address", { status: "ready", email: "" }],
      ["a status another function owns", { status: "warned" }],
      ["no data", null],
    ])("is unknown, never a send to nobody, for %s", async (_case, data) => {
      rpc.mockResolvedValue(ok(data));

      await expect(startWarning({ caseId: CASE_ID })).resolves.toEqual({ ok: false, failure: "unknown" });
      expectNothingSecretLogged();
    });
  });

  describe("markWarned", () => {
    // implements FR-11 of admin-violations-feedback
    it.each(["warned", "not-found", "already-warned"])("sends the case id only and returns the answer %s", async (status) => {
      rpc.mockResolvedValue(ok({ status }));

      await expect(markWarned({ caseId: CASE_ID })).resolves.toEqual({ ok: true, status });
      expect(rpc).toHaveBeenCalledExactlyOnceWith("admin_mark_warned", { case_id: CASE_ID });
    });
  });

  describe("every function but logNotice", () => {
    const CALLS = [
      ["addViolationCase", () => addViolationCase(ADD_INPUT)],
      ["addViolationCaseForAuthor", () => addViolationCaseForAuthor({ authorProfileId: AUTHOR_PROFILE_ID, ground: "harmful-content" })],
      ["listViolationCases", () => listViolationCases()],
      ["setCaseGround", () => setCaseGround({ caseId: CASE_ID, ground: "harmful-content" })],
      ["removeViolationCase", () => removeViolationCase({ caseId: CASE_ID })],
      ["startWarning", () => startWarning({ caseId: CASE_ID })],
      ["markWarned", () => markWarned({ caseId: CASE_ID })],
    ] as const;

    // implements FR-12, FR-15 of admin-violations-feedback
    it.each(CALLS)("%s keeps a refused admin check, an ended session and an outage apart, logging no secret", async (_name, call) => {
      for (const [response, failure] of [
        [rpcError("42501", HTTP_FORBIDDEN), "forbidden"],
        [rpcError("PGRST301", HTTP_UNAUTHORIZED), "unauthenticated"],
        [rpcError("XX000", HTTP_UNAVAILABLE), "unavailable"],
        [rpcError("", NO_RESPONSE), "unavailable"],
      ] as const) {
        rpc.mockResolvedValueOnce(response);

        await expect(call()).resolves.toEqual({ ok: false, failure });
      }
      expectNothingSecretLogged();
    });

    // implements FR-15 of admin-violations-feedback
    it.each(CALLS)("%s turns a thrown error into a failure value and logs its class only", async (_name, call) => {
      rpc.mockRejectedValue(new TypeError(`fetch failed for ${TARGET_EMAIL}`));

      await expect(call()).resolves.toEqual({ ok: false, failure: "unavailable" });
      expect(vi.mocked(console.error).mock.calls[0]?.[0]).toMatch(/^\[admin\] .* failed: TypeError$/);
      expectNothingSecretLogged();
    });
  });

  describe("logNotice", () => {
    // implements FR-12 of admin-violations-feedback
    it("sends the user, the kind and the outcome, and nothing else", async () => {
      rpc.mockResolvedValue(ok(null));

      await expect(logNotice(TARGET_USER_ID, "delete-poem", "failed")).resolves.toBeUndefined();
      expect(rpc).toHaveBeenCalledExactlyOnceWith("admin_log_notice", {
        target_user_id: TARGET_USER_ID,
        notice_kind: "delete-poem",
        outcome: "failed",
      });
      expect(console.error).not.toHaveBeenCalled();
    });

    // implements FR-12, FR-14 of admin-violations-feedback
    it("swallows a refused call and logs the operation and the kind only", async () => {
      rpc.mockResolvedValue(rpcError("42501", HTTP_FORBIDDEN));

      await expect(logNotice(TARGET_USER_ID, "block", "sent")).resolves.toBeUndefined();
      expect(console.error).toHaveBeenCalledExactlyOnceWith("[admin] log notice failed: PostgrestError 42501");
      expectNothingSecretLogged();
    });

    // implements FR-12, FR-14 of admin-violations-feedback
    it("swallows a thrown error and logs its class only", async () => {
      rpc.mockRejectedValue(new TypeError(`fetch failed for ${TARGET_EMAIL}`));

      await expect(logNotice(TARGET_USER_ID, "ban", "failed")).resolves.toBeUndefined();
      expect(console.error).toHaveBeenCalledExactlyOnceWith("[admin] log notice failed: TypeError");
      expectNothingSecretLogged();
    });
  });
});
