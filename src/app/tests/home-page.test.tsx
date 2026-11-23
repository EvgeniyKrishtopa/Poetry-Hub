import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import HomePage from "../(public)/page";

const { session, homeJoinCta } = vi.hoisted(() => ({
  session: { signedIn: false },
  homeJoinCta: vi.fn(),
}));

// The two boundaries are stood in for by marked wrappers, so the test can see what sits inside which. Like the
// real boundary, the stand-in renders its children (so reads the closing copy) only for a signed-out visitor.
vi.mock("@/features/auth", () => ({
  SignedOutOnly: ({ children }: { children: ReactNode }) =>
    session.signedIn ? null : <div data-testid="signed-out-only">{children}</div>,
}));
vi.mock("@/features/home", () => ({
  HomeSections: () => <p>shared sections</p>,
  HomeJoinCta: homeJoinCta,
  getHomePageMetadata: () => ({}),
}));

describe("home page", () => {
  beforeEach(() => {
    session.signedIn = false;
    homeJoinCta.mockReset();
    homeJoinCta.mockReturnValue(<h2>closing invitation</h2>);
  });

  // implements FR-1, FR-2, FR-3, FR-4, FR-5, FR-6 of home-page-sections
  it("renders the shared sections first and the closing invitation after them", () => {
    render(<HomePage />);

    const main = screen.getByRole("main");
    const sections = within(main).getByText("shared sections");
    const invitation = within(main).getByRole("heading", { name: "closing invitation" });
    expect(sections.compareDocumentPosition(invitation) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // implements FR-6 of home-page-sections: hidden from a signed-in reader and an admin by the boundary
  it("puts the closing invitation, and only it, inside the signed-out-only boundary", () => {
    render(<HomePage />);

    const boundary = screen.getByTestId("signed-out-only");
    expect(within(boundary).getByRole("heading", { name: "closing invitation" })).toBeInTheDocument();
    expect(within(boundary).queryByText("shared sections")).toBeNull();
  });

  // implements FR-6 of home-sections: a signed-in reader, or an admin, never triggers the closing read
  it("does not render the closing invitation, so makes no CMS read, for a signed-in session", () => {
    session.signedIn = true;

    render(<HomePage />);

    expect(screen.queryByRole("heading", { name: "closing invitation" })).toBeNull();
    expect(homeJoinCta).not.toHaveBeenCalled();
    expect(screen.getByText("shared sections")).toBeInTheDocument();
  });
});
