import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSessionExpiredNotice } from "@/shared/lib/one-time-notice/session-expired-notice.store";

import { SessionExpiredNotice } from "../../components/SessionExpiredNotice/SessionExpiredNotice";

/** Lets the notice's scheduled dismissal and store re-read run, if any are pending. */
async function flushTimers(): Promise<void> {
  await act(async () => {
    await vi.runAllTimersAsync();
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  useSessionExpiredNotice.getState().clearSessionExpired();
  vi.useRealTimers();
});

describe("SessionExpiredNotice", () => {
  // implements FR-6 of delete-poem
  it("shows the session-expired text as a neutral status once flagged, and clears the flag", async () => {
    useSessionExpiredNotice.getState().markSessionExpired();

    render(<SessionExpiredNotice />);
    await flushTimers();

    const notice = screen.getByRole("status");
    expect(notice).toHaveTextContent(/^Сессия истекла\. Войдите снова\.$/);
    expect(notice).toHaveClass("border-muted");
    expect(useSessionExpiredNotice.getState().expired).toBe(false);
  });

  // implements FR-6 of delete-poem: only once
  it("shows nothing on the next visit: a new mount finds the flag cleared", async () => {
    useSessionExpiredNotice.getState().markSessionExpired();
    const first = render(<SessionExpiredNotice />);
    await flushTimers();
    first.unmount();

    render(<SessionExpiredNotice />);
    await flushTimers();

    expect(screen.queryByRole("status")).toBeNull();
  });

  // implements FR-6 of delete-poem: plain visit
  it("renders nothing on a plain visit", async () => {
    const { container } = render(<SessionExpiredNotice />);
    await flushTimers();

    expect(container).toBeEmptyDOMElement();
  });
});
