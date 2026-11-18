import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { addViolationCaseAction, addViolationCaseForAuthorAction } from "../../actions/add-violation-case.actions";
import { useAddViolationCase } from "../../hooks/use-add-violation-case";
import type { AddCaseActionResult } from "../../model/violation.types";

vi.mock("../../actions/add-violation-case.actions", () => ({
  addViolationCaseAction: vi.fn(),
  addViolationCaseForAuthorAction: vi.fn(),
}));
const connection = vi.hoisted(() => ({ status: "online" as "online" | "offline" }));
vi.mock("@/shared/lib/network/use-connection", () => ({
  useConnection: () => ({ status: connection.status, isOnline: connection.status === "online" }),
}));

afterEach(() => {
  vi.clearAllMocks();
  connection.status = "online";
});

const USER_ID = "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";
const PROFILE_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const POEM_ID = "30000000-0000-4000-8000-000000000021";

type UserResponse = Awaited<ReturnType<typeof addViolationCaseAction>>;
const respond = (result: AddCaseActionResult) => ({ data: result }) as UserResponse;

describe("useAddViolationCase", () => {
  // implements FR-1 of admin-violations-feedback
  it("adds a user by id with the chosen ground and keeps the answer", async () => {
    vi.mocked(addViolationCaseAction).mockResolvedValue(respond({ ok: true, status: "added" }));
    const { result } = renderHook(() => useAddViolationCase());

    let answer: AddCaseActionResult | undefined;
    await act(async () => {
      answer = await result.current.add({ target: { by: "user", userId: USER_ID }, ground: "malicious-activity" });
    });

    expect(addViolationCaseAction).toHaveBeenCalledExactlyOnceWith({
      userId: USER_ID,
      ground: "malicious-activity",
      content: undefined,
    });
    expect(answer).toEqual({ ok: true, status: "added" });
    expect(result.current.result).toEqual({ ok: true, status: "added" });
    expect(result.current.isPending).toBe(false);
  });

  // implements FR-2 of admin-violations-feedback
  it("adds an author by profile id with the poem that prompted it", async () => {
    vi.mocked(addViolationCaseForAuthorAction).mockResolvedValue(respond({ ok: true, status: "already-in-list" }));
    const { result } = renderHook(() => useAddViolationCase());

    await act(async () => {
      await result.current.add({
        target: { by: "author", authorProfileId: PROFILE_ID },
        ground: "harmful-content",
        content: { kind: "poem", id: POEM_ID },
      });
    });

    expect(addViolationCaseForAuthorAction).toHaveBeenCalledExactlyOnceWith({
      authorProfileId: PROFILE_ID,
      ground: "harmful-content",
      content: { kind: "poem", id: POEM_ID },
    });
    expect(addViolationCaseAction).not.toHaveBeenCalled();
    expect(result.current.result).toEqual({ ok: true, status: "already-in-list" });
  });

  // implements FR-15 of admin-violations-feedback
  it("reads a thrown action and a missing answer as unavailable", async () => {
    vi.mocked(addViolationCaseAction).mockRejectedValueOnce(new Error("network"));
    vi.mocked(addViolationCaseAction).mockResolvedValueOnce({} as UserResponse);
    const { result } = renderHook(() => useAddViolationCase());

    await act(async () => {
      await result.current.add({ target: { by: "user", userId: USER_ID }, ground: "harmful-content" });
    });
    expect(result.current.result).toEqual({ ok: false, reason: "unavailable" });

    await act(async () => {
      await result.current.add({ target: { by: "user", userId: USER_ID }, ground: "harmful-content" });
    });
    expect(result.current.result).toEqual({ ok: false, reason: "unavailable" });
  });

  // implements FR-1 of admin-violations-feedback
  it("is pending while the call runs, and a second call joins it instead of sending another", async () => {
    let settle: (value: UserResponse) => void = () => undefined;
    vi.mocked(addViolationCaseAction).mockReturnValue(new Promise<UserResponse>((resolve) => (settle = resolve)));
    const { result } = renderHook(() => useAddViolationCase());

    let first: Promise<AddCaseActionResult> = Promise.resolve({ ok: false, reason: "invalid" });
    let second: Promise<AddCaseActionResult> = Promise.resolve({ ok: false, reason: "invalid" });
    act(() => {
      first = result.current.add({ target: { by: "user", userId: USER_ID }, ground: "harmful-content" });
      second = result.current.add({ target: { by: "user", userId: USER_ID }, ground: "malicious-activity" });
    });

    expect(result.current.isPending).toBe(true);
    expect(addViolationCaseAction).toHaveBeenCalledTimes(1);
    await act(async () => settle(respond({ ok: true, status: "added" })));
    await expect(first).resolves.toEqual({ ok: true, status: "added" });
    await expect(second).resolves.toEqual({ ok: true, status: "added" });
    expect(result.current.isPending).toBe(false);
  });

  // implements FR-3 of admin-violations-feedback
  it("forgets the answer when it is cleared", async () => {
    vi.mocked(addViolationCaseAction).mockResolvedValue(respond({ ok: true, status: "added" }));
    const { result } = renderHook(() => useAddViolationCase());
    await act(async () => {
      await result.current.add({ target: { by: "user", userId: USER_ID }, ground: "harmful-content" });
    });

    act(() => result.current.clearResult());

    expect(result.current.result).toBeNull();
  });

  // implements FR-15 of admin-violations-feedback
  it("reports the connection the controls read", () => {
    connection.status = "offline";

    const { result } = renderHook(() => useAddViolationCase());

    expect(result.current.connectionStatus).toBe("offline");
    expect(result.current.isOnline).toBe(false);
  });
});
