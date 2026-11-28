import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getSessionState } from "@/features/auth";

import { AddToViolationsControlContent } from "../../components/AddToViolationsControl/AddToViolationsControlContent";
import { checkMayModerateAuthor } from "../../dal/admin-check";
import { ADD_TO_VIOLATIONS_COPY } from "../../model/admin-messages";

vi.mock("@/features/auth", () => ({ getSessionState: vi.fn() }));
vi.mock("../../dal/admin-check", () => ({ checkMayModerateAuthor: vi.fn() }));
vi.mock("../../actions/add-violation-case.actions", () => ({
  addViolationCaseAction: vi.fn(),
  addViolationCaseForAuthorAction: vi.fn(),
}));

const SIGNED_IN = { state: "signed-in", userId: "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b", aal: "aal1", amr: [] } as const;
const AUTHOR_ID = "11111111-2222-4333-8444-555555555555";
const PROPS = { authorId: AUTHOR_ID, authorName: "Анна Ахматова" } as const;

afterEach(() => vi.clearAllMocks());

describe("AddToViolationsControlContent", () => {
  // implements FR-2 of admin-violations-feedback
  it("shows the add button for a signed-in reader who may moderate the author, asking about that author", async () => {
    vi.mocked(getSessionState).mockResolvedValue(SIGNED_IN);
    vi.mocked(checkMayModerateAuthor).mockResolvedValue({ ok: true, mayModerate: true });

    render(await AddToViolationsControlContent(PROPS));

    expect(checkMayModerateAuthor).toHaveBeenCalledWith(AUTHOR_ID);
    expect(screen.getByRole("button", { name: ADD_TO_VIOLATIONS_COPY.button })).toBeInTheDocument();
  });

  // implements FR-2 of admin-violations-feedback
  it("renders nothing for a non-admin, the author, or an admin on their own page", async () => {
    vi.mocked(getSessionState).mockResolvedValue(SIGNED_IN);
    vi.mocked(checkMayModerateAuthor).mockResolvedValue({ ok: true, mayModerate: false });

    expect(await AddToViolationsControlContent(PROPS)).toBeNull();
  });

  // implements FR-2 of admin-violations-feedback
  it("renders nothing when the check can't be read", async () => {
    vi.mocked(getSessionState).mockResolvedValue(SIGNED_IN);
    vi.mocked(checkMayModerateAuthor).mockResolvedValue({ ok: false, failure: "unavailable" });

    expect(await AddToViolationsControlContent(PROPS)).toBeNull();
  });

  // implements FR-2, NFR-4 of admin-violations-feedback
  it("renders nothing and asks no RPC for a guest or an unreadable session", async () => {
    vi.mocked(getSessionState).mockResolvedValueOnce({ state: "signed-out" });
    expect(await AddToViolationsControlContent(PROPS)).toBeNull();

    vi.mocked(getSessionState).mockResolvedValueOnce({ state: "unknown" });
    expect(await AddToViolationsControlContent(PROPS)).toBeNull();

    expect(checkMayModerateAuthor).not.toHaveBeenCalled();
  });
});
