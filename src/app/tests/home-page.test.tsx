import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import HomePage from "../(public)/page";

const { session, homeJoinCta, authNotice } = vi.hoisted(() => ({
  session: { signedIn: false },
  homeJoinCta: vi.fn(),
  authNotice: { received: undefined as Promise<unknown> | undefined },
}));

function renderHome(params: Record<string, string> = {}) {
  const searchParams = Promise.resolve(params);
  return render(<HomePage params={Promise.resolve({})} searchParams={searchParams} />);
}

// The two boundaries are stood in for by marked wrappers, so the test can see what sits inside which. Like the
// real boundary, the stand-in renders its children (so reads the closing copy) only for a signed-out visitor.
vi.mock("@/features/auth", () => ({
  AUTH_NOTICE_PARAM: "auth-notice",
  AuthNotice: ({ notice }: { notice: Promise<unknown> }) => {
    authNotice.received = notice;
    return <p>auth notice</p>;
  },
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
    renderHome();

    const main = screen.getByRole("main");
    const sections = within(main).getByText("shared sections");
    const invitation = within(main).getByRole("heading", { name: "closing invitation" });
    expect(sections.compareDocumentPosition(invitation) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // implements FR-G6 of google-sign-in: the notice sits above the hero and reads ?auth-notice
  it("renders the auth notice before the shared sections, passing it the auth-notice param", async () => {
    renderHome({ "auth-notice": "account-exists" });

    const notice = screen.getByText("auth notice");
    const sections = screen.getByText("shared sections");
    expect(notice.compareDocumentPosition(sections) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await expect(authNotice.received).resolves.toBe("account-exists");
  });

  // implements FR-6 of home-page-sections: hidden from a signed-in reader and an admin by the boundary
  it("puts the closing invitation, and only it, inside the signed-out-only boundary", () => {
    renderHome();

    const boundary = screen.getByTestId("signed-out-only");
    expect(within(boundary).getByRole("heading", { name: "closing invitation" })).toBeInTheDocument();
    expect(within(boundary).queryByText("shared sections")).toBeNull();
  });

  // implements FR-6 of home-contentful-content: a signed-in reader, or an admin, never triggers the closing read
  it("does not render the closing invitation, so makes no CMS read, for a signed-in session", () => {
    session.signedIn = true;

    renderHome();

    expect(screen.queryByRole("heading", { name: "closing invitation" })).toBeNull();
    expect(homeJoinCta).not.toHaveBeenCalled();
    expect(screen.getByText("shared sections")).toBeInTheDocument();
  });
});
