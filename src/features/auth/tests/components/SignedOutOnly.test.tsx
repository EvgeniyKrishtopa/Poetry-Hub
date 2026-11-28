import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SignedOutOnlyContent } from "../../components/SignedOutOnly/SignedOutOnlyContent";
import { getSessionState } from "../../dal/current-user";

vi.mock("../../dal/current-user", () => ({ getSessionState: vi.fn() }));

const SIGNED_IN = { state: "signed-in", userId: "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b", aal: "aal1", amr: [] } as const;

const CHILD_TEXT = "signed-out only content";
const child = <p>{CHILD_TEXT}</p>;

afterEach(() => vi.clearAllMocks());

describe("SignedOutOnlyContent", () => {
  // implements FR-6 of home-page-sections
  it("renders its children for a visitor who is not signed in", async () => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-out" });

    render(await SignedOutOnlyContent({ children: child }));

    expect(screen.getByText(CHILD_TEXT)).toBeInTheDocument();
  });

  // implements FR-6 of home-page-sections: an admin is a signed-in reader too
  it("renders nothing for a signed-in reader", async () => {
    vi.mocked(getSessionState).mockResolvedValue(SIGNED_IN);

    expect(await SignedOutOnlyContent({ children: child })).toBeNull();
  });

  // implements FR-6 of home-page-sections
  it("renders nothing when the session cannot be read", async () => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "unknown" });

    expect(await SignedOutOnlyContent({ children: child })).toBeNull();
  });
});
