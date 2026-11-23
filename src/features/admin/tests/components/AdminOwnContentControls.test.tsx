import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getSessionState } from "@/features/auth";

import { AddToHomeControlContent } from "../../components/AddToHomeControl/AddToHomeControlContent";
import { AddToViolationsControlContent } from "../../components/AddToViolationsControl/AddToViolationsControlContent";
import { AdminDeleteControlContent } from "../../components/AdminDeleteControl/AdminDeleteControlContent";
import { readAdminAccess } from "../../dal/admin-access";
import { checkMayModerateAuthor } from "../../dal/admin-check";
import { ADD_TO_HOME_COPY } from "../../model/admin-messages";

vi.mock("@/features/auth", () => ({ getSessionState: vi.fn() }));
vi.mock("../../dal/admin-access", () => ({ readAdminAccess: vi.fn() }));
vi.mock("../../dal/admin-check", () => ({ checkMayModerateAuthor: vi.fn() }));
vi.mock("../../actions/add-home-poem.actions", () => ({ addHomePoemAction: vi.fn() }));
vi.mock("../../actions/add-home-author.actions", () => ({ addHomeAuthorAction: vi.fn() }));
vi.mock("../../actions/add-violation-case.actions", () => ({
  addViolationCaseAction: vi.fn(),
  addViolationCaseForAuthorAction: vi.fn(),
}));

const SIGNED_IN = { state: "signed-in", userId: "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b" } as const;
const AUTHOR_ID = "11111111-2222-4333-8444-555555555555";
const POEM = { id: "30000000-0000-4000-8000-000000000051", title: "Осенний сад" } as const;

afterEach(() => vi.clearAllMocks());

describe("an admin on their own poem", () => {
  // implements FR-8 of home-page-sections
  it("gets the home control while the delete and review-list controls stay hidden", async () => {
    vi.mocked(getSessionState).mockResolvedValue(SIGNED_IN);
    vi.mocked(readAdminAccess).mockResolvedValue("admin");
    vi.mocked(checkMayModerateAuthor).mockResolvedValue({ ok: true, mayModerate: false });

    const home = await AddToHomeControlContent({ kind: "poem", id: POEM.id });
    const violations = await AddToViolationsControlContent({
      authorId: AUTHOR_ID,
      authorName: "Анна Ахматова",
      content: { kind: "poem", id: POEM.id, title: POEM.title },
    });
    const remove = await AdminDeleteControlContent({
      kind: "poem",
      id: POEM.id,
      title: POEM.title,
      authorId: AUTHOR_ID,
      redirectHref: `/authors/${AUTHOR_ID}`,
    });

    expect(violations).toBeNull();
    expect(remove).toBeNull();
    render(home);
    expect(screen.getByRole("button", { name: ADD_TO_HOME_COPY.button })).toBeInTheDocument();
  });
});
