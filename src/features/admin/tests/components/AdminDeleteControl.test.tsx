import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getSessionState } from "@/features/auth";

import { AdminDeleteControlContent } from "../../components/AdminDeleteControl/AdminDeleteControlContent";
import { checkMayModerateAuthor } from "../../dal/admin-check";

vi.mock("@/features/auth", () => ({ getSessionState: vi.fn() }));
vi.mock("../../dal/admin-check", () => ({ checkMayModerateAuthor: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("../../actions/delete-poem.actions", () => ({ deletePoemAction: vi.fn() }));
vi.mock("../../actions/delete-collection.actions", () => ({ deleteCollectionAction: vi.fn() }));

const SIGNED_IN = { state: "signed-in", userId: "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b", aal: "aal1", amr: [] } as const;
const AUTHOR_ID = "11111111-2222-4333-8444-555555555555";

const PROPS = {
  kind: "poem",
  id: "30000000-0000-4000-8000-000000000051",
  title: "Осенний сад",
  authorId: AUTHOR_ID,
  redirectHref: `/authors/${AUTHOR_ID}`,
} as const;

afterEach(() => vi.clearAllMocks());

describe("AdminDeleteControlContent", () => {
  // implements FR-10 of admin-moderation
  it("shows the delete button for a signed-in reader who may moderate the author", async () => {
    vi.mocked(getSessionState).mockResolvedValue(SIGNED_IN);
    vi.mocked(checkMayModerateAuthor).mockResolvedValue({ ok: true, mayModerate: true });

    render(await AdminDeleteControlContent(PROPS));

    expect(checkMayModerateAuthor).toHaveBeenCalledWith(AUTHOR_ID);
    expect(screen.getByRole("button", { name: "Удалить произведение (админ)" })).toBeInTheDocument();
  });

  // implements FR-10 of admin-moderation
  it("shows the collection wording for a collection", async () => {
    vi.mocked(getSessionState).mockResolvedValue(SIGNED_IN);
    vi.mocked(checkMayModerateAuthor).mockResolvedValue({ ok: true, mayModerate: true });

    render(await AdminDeleteControlContent({ ...PROPS, kind: "collection" }));

    expect(screen.getByRole("button", { name: "Удалить сборник (админ)" })).toBeInTheDocument();
  });

  // implements FR-10 of admin-moderation
  it("renders nothing when the reader may not moderate: a non-admin, the author, or an admin on their own work", async () => {
    vi.mocked(getSessionState).mockResolvedValue(SIGNED_IN);
    vi.mocked(checkMayModerateAuthor).mockResolvedValue({ ok: true, mayModerate: false });

    expect(await AdminDeleteControlContent(PROPS)).toBeNull();
  });

  // implements FR-10 of admin-moderation
  it("renders nothing when the check can't be read", async () => {
    vi.mocked(getSessionState).mockResolvedValue(SIGNED_IN);
    vi.mocked(checkMayModerateAuthor).mockResolvedValue({ ok: false, failure: "unavailable" });

    expect(await AdminDeleteControlContent(PROPS)).toBeNull();
  });

  // implements FR-10, NFR-3 of admin-moderation
  it("renders nothing and asks no RPC for a guest or an unreadable session", async () => {
    vi.mocked(getSessionState).mockResolvedValueOnce({ state: "signed-out" });
    expect(await AdminDeleteControlContent(PROPS)).toBeNull();

    vi.mocked(getSessionState).mockResolvedValueOnce({ state: "unknown" });
    expect(await AdminDeleteControlContent(PROPS)).toBeNull();

    expect(checkMayModerateAuthor).not.toHaveBeenCalled();
  });
});
