import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AuthStatus } from "../../components/AuthStatus/AuthStatus";

vi.mock("../../actions/auth.actions", () => ({ signOutAction: vi.fn() }));

describe("AuthStatus", () => {
  // implements FR-1 of remove-browser-session-read
  it("shows a Sign in link to /login and no Sign out when signed out", () => {
    render(<AuthStatus signedIn={false} />);

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Личный кабинет" })).not.toBeInTheDocument();
  });

  // implements FR-2 of remove-browser-session-read; FR-3, NFR-8 of add-author-profiles
  it("shows «Личный кабинет» (lang=ru) and a Sign out button, with no email, when signed in", () => {
    const { container } = render(<AuthStatus signedIn />);

    const account = screen.getByRole("link", { name: "Личный кабинет" });
    expect(account).toHaveAttribute("href", "/account");
    expect(account).toHaveAttribute("lang", "ru");
    expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
    expect(container).not.toHaveTextContent("@");
  });
});
