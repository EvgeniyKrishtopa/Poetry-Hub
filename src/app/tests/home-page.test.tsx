import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import HomePage from "../(public)/page";

// The two boundaries are stood in for by marked wrappers, so the test can see what sits inside which.
vi.mock("@/features/auth", () => ({
  SignedOutOnly: ({ children }: { children: ReactNode }) => <div data-testid="signed-out-only">{children}</div>,
}));
vi.mock("@/features/home", () => ({
  HomeSections: () => <p>shared sections</p>,
  HomeJoinCta: () => <h2>closing invitation</h2>,
  getHomePageMetadata: () => ({}),
}));

describe("home page", () => {
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
});
