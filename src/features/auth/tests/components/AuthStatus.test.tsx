import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AccountLink } from "../../components/AccountLink/AccountLink";
import { AuthStatus } from "../../components/AuthStatus/AuthStatus";

vi.mock("../../actions/auth.actions", () => ({ signOutAction: vi.fn() }));

describe("AuthStatus", () => {
  // implements FR-1 of remove-browser-session-read
  it("shows a Sign in link to /login and no Sign out when signed out", () => {
    render(<AuthStatus session="signed-out" />);

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Мастерская поэта" })).not.toBeInTheDocument();
  });

  // implements FR-2 of remove-browser-session-read; FR-3 of add-author-profiles
  it("shows «Мастерская поэта» and a Sign out button, with no email, when signed in", () => {
    const { container } = render(<AuthStatus session="signed-in" />);

    expect(screen.getByRole("link", { name: "Мастерская поэта" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
    expect(container).not.toHaveTextContent("@");
  });

  // implements FR-20 of add-author-profiles
  it("shows only the empty placeholder when the session can't be checked", () => {
    const { container } = render(<AuthStatus session="unknown" />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(container.firstElementChild).toHaveClass("min-w-24");
  });
});

describe("AccountLink", () => {
  // implements FR-3, NFR-8 of add-author-profiles
  it("links «Мастерская поэта» to /account with lang=ru", () => {
    render(<AccountLink />);

    const link = screen.getByRole("link", { name: "Мастерская поэта" });
    expect(link).toHaveAttribute("href", "/account");
    expect(link).toHaveAttribute("lang", "ru");
  });
});
