import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminUserList } from "../../components/AdminUserList/AdminUserList";
import { listUsers } from "../../dal/user-list";
import { ADMIN_LIST_COPY } from "../../model/admin-messages";
import type { AdminUser } from "../../model/admin.types";

vi.mock("../../dal/user-list", () => ({ listUsers: vi.fn() }));
vi.mock("../../components/AdminUserRow/AdminUserRow", () => ({
  AdminUserRow: ({ user }: { user: AdminUser }) => <li>{user.email}</li>,
}));

afterEach(() => vi.clearAllMocks());

const CURSOR = "2026-11-13T17:15:29.123456+00:00_2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";
const USER: AdminUser = {
  id: "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d",
  email: "anna.lis@example.com",
  authorName: null,
  createdAt: "2026-11-12T10:00:00+00:00",
  lastSignInAt: null,
  restriction: null,
  isAdmin: false,
};

describe("AdminUserList", () => {
  // implements FR-3 of admin-moderation
  it("renders the rows and a next link that carries the cursor and the filter, no first-page link on page 1", async () => {
    vi.mocked(listUsers).mockResolvedValue({
      ok: true,
      users: [USER],
      nextCursor: CURSOR,
    });

    render(await AdminUserList({ query: { email: "a@b.co" } }));

    expect(screen.getByText(USER.email)).toBeInTheDocument();
    const next = screen.getByRole("link", { name: ADMIN_LIST_COPY.nextLink });
    const params = new URL(next.getAttribute("href") ?? "", "https://example.test").searchParams;
    expect(params.get("after")).toBe(CURSOR);
    expect(params.get("email")).toBe("a@b.co");
    expect(screen.queryByRole("link", { name: ADMIN_LIST_COPY.firstPageLink })).not.toBeInTheDocument();
  });

  // implements FR-3 of admin-moderation
  it("on a later page shows only the first-page link when there is no next page", async () => {
    vi.mocked(listUsers).mockResolvedValue({
      ok: true,
      users: [USER],
      nextCursor: null,
    });

    render(await AdminUserList({ query: { after: CURSOR } }));

    expect(screen.getByRole("link", { name: ADMIN_LIST_COPY.firstPageLink })).toHaveAttribute("href", "/admin");
    expect(screen.queryByRole("link", { name: ADMIN_LIST_COPY.nextLink })).not.toBeInTheDocument();
  });

  // implements FR-3 of admin-moderation
  it("shows the muted empty text when nothing matches", async () => {
    vi.mocked(listUsers).mockResolvedValue({
      ok: true,
      users: [],
      nextCursor: null,
    });

    render(await AdminUserList({ query: { email: "none@b.co" } }));

    expect(screen.getByText(ADMIN_LIST_COPY.empty)).toBeInTheDocument();
  });

  // implements FR-2 of admin-moderation
  it("shows the danger alert when the list can't be read", async () => {
    vi.mocked(listUsers).mockResolvedValue({
      ok: false,
      failure: "unavailable",
    });

    render(await AdminUserList({ query: {} }));

    expect(screen.getByRole("alert")).toHaveTextContent(ADMIN_LIST_COPY.loadFailed);
  });
});
