import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getSessionState } from "@/features/auth";

import { AddToHomeControlContent } from "../../components/AddToHomeControl/AddToHomeControlContent";
import { readAdminAccess } from "../../dal/admin-access";
import { checkMayModerateAuthor } from "../../dal/admin-check";
import { ADD_TO_HOME_COPY } from "../../model/admin-messages";

vi.mock("@/features/auth", () => ({ getSessionState: vi.fn() }));
vi.mock("../../dal/admin-access", () => ({ readAdminAccess: vi.fn() }));
vi.mock("../../dal/admin-check", () => ({ checkMayModerateAuthor: vi.fn() }));
vi.mock("../../actions/add-home-poem.actions", () => ({ addHomePoemAction: vi.fn() }));
vi.mock("../../actions/add-home-author.actions", () => ({ addHomeAuthorAction: vi.fn() }));

const SIGNED_IN = { state: "signed-in", userId: "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b" } as const;
const POEM_ID = "30000000-0000-4000-8000-000000000051";

afterEach(() => vi.clearAllMocks());

describe("AddToHomeControlContent", () => {
  // implements FR-8 of home-page-sections
  it("shows the button to a signed-in admin, asking only the per-request admin answer", async () => {
    vi.mocked(getSessionState).mockResolvedValue(SIGNED_IN);
    vi.mocked(readAdminAccess).mockResolvedValue("admin");

    render(await AddToHomeControlContent({ kind: "poem", id: POEM_ID }));

    expect(readAdminAccess).toHaveBeenCalledExactlyOnceWith("signed-in");
    expect(screen.getByRole("button", { name: ADD_TO_HOME_COPY.button })).toBeInTheDocument();
  });

  // implements FR-8 of home-page-sections
  it("never asks whether the reader may moderate the author, so an admin's own content gets the button too", async () => {
    vi.mocked(getSessionState).mockResolvedValue(SIGNED_IN);
    vi.mocked(readAdminAccess).mockResolvedValue("admin");
    vi.mocked(checkMayModerateAuthor).mockResolvedValue({ ok: true, mayModerate: false });

    render(await AddToHomeControlContent({ kind: "poem", id: POEM_ID }));

    expect(checkMayModerateAuthor).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: ADD_TO_HOME_COPY.button })).toBeInTheDocument();
  });

  // implements FR-8 of home-page-sections
  it("shows it for an author the same way", async () => {
    vi.mocked(getSessionState).mockResolvedValue(SIGNED_IN);
    vi.mocked(readAdminAccess).mockResolvedValue("admin");

    render(await AddToHomeControlContent({ kind: "author", id: POEM_ID }));

    expect(screen.getByRole("button", { name: ADD_TO_HOME_COPY.button })).toBeInTheDocument();
  });

  // implements FR-8 of home-page-sections
  it("renders nothing for a signed-in reader who is not an admin, or whose check can't be read", async () => {
    vi.mocked(getSessionState).mockResolvedValue(SIGNED_IN);

    vi.mocked(readAdminAccess).mockResolvedValueOnce("not-admin");
    expect(await AddToHomeControlContent({ kind: "poem", id: POEM_ID })).toBeNull();

    vi.mocked(readAdminAccess).mockResolvedValueOnce("unavailable");
    expect(await AddToHomeControlContent({ kind: "poem", id: POEM_ID })).toBeNull();
  });

  // implements FR-8 of home-page-sections
  it("renders nothing and asks no admin check for a guest", async () => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-out" });

    expect(await AddToHomeControlContent({ kind: "poem", id: POEM_ID })).toBeNull();
    expect(readAdminAccess).not.toHaveBeenCalled();
  });

  // implements FR-8 of home-page-sections
  it("renders nothing when the session can't be read, since the shared answer reads that as unavailable", async () => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "unknown" });
    vi.mocked(readAdminAccess).mockResolvedValue("unavailable");

    expect(await AddToHomeControlContent({ kind: "poem", id: POEM_ID })).toBeNull();
    expect(readAdminAccess).toHaveBeenCalledExactlyOnceWith("unknown");
  });
});
