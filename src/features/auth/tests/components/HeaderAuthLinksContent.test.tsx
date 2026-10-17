import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HeaderAuthLinksContent } from "../../components/HeaderAuthLinksContent/HeaderAuthLinksContent";
import { getSessionState } from "../../dal/current-user";

vi.mock("../../dal/current-user", () => ({ getSessionState: vi.fn() }));
vi.mock("../../actions/auth.actions", () => ({ signOutAction: vi.fn() }));

const USER_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";

describe("HeaderAuthLinksContent", () => {
  // implements FR-3 of remove-browser-session-read
  it("renders Sign out when the server reports a signed-in reader, with no user id in the output", async () => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-in", userId: USER_ID });

    const { container } = render(await HeaderAuthLinksContent());

    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(container.innerHTML).not.toContain(USER_ID);
  });

  it("renders the Sign in link when the server reports no session", async () => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-out" });

    render(await HeaderAuthLinksContent());

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  });

  // implements FR-20 of add-author-profiles
  it("renders neither link when the session can't be checked", async () => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "unknown" });

    render(await HeaderAuthLinksContent());

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
