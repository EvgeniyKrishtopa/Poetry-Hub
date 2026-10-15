import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HeaderSession } from "../../components/HeaderSession/HeaderSession";
import { isSignedIn } from "../../dal/is-signed-in";

vi.mock("../../dal/is-signed-in", () => ({ isSignedIn: vi.fn() }));
vi.mock("../../actions/auth.actions", () => ({ signOutAction: vi.fn() }));

describe("HeaderSession", () => {
  // implements FR-3 of remove-browser-session-read
  it("renders Sign out when the server reports a signed-in reader", async () => {
    vi.mocked(isSignedIn).mockResolvedValue(true);

    render(await HeaderSession());

    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("renders the Sign in link when the server reports no session", async () => {
    vi.mocked(isSignedIn).mockResolvedValue(false);

    render(await HeaderSession());

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  });
});
