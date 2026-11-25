import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ResetPasswordRoute from "../(public)/reset-password/page";

const received = vi.hoisted(() => ({ statuses: [] as Promise<unknown>[] }));

// The feature component is a stand-in: this test only pins what the route composes and which request data it passes.
vi.mock("@/features/auth", () => ({
  RESET_STATUS_PARAM: "status",
  ResetPasswordPage: ({ status }: { status: Promise<unknown> }) => {
    received.statuses.push(status);
    return <section>reset password content</section>;
  },
  getResetPasswordPageMetadata: () => ({}),
}));

describe("reset-password route page", () => {
  // implements FR-4 of password-recovery
  it("passes the status search param to the feature inside the main landmark", async () => {
    received.statuses = [];
    const searchParams = Promise.resolve({ status: "updated" });

    render(<ResetPasswordRoute params={Promise.resolve({})} searchParams={searchParams} />);

    expect(screen.getByRole("main")).toHaveTextContent("reset password content");
    expect(await Promise.all(received.statuses)).toEqual(["updated"]);
  });
});
