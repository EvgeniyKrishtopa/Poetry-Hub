import { act, render, screen } from "@testing-library/react";
import { Activity, StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useOneTimeValue } from "../use-one-time-value";

const FIRST_VALUE = "first";
const SECOND_VALUE = "second";
const EMPTY_TEXT = "empty";

// A plain stand-in for a Zustand store: the hook only needs a read and a clear.
let stored: string | null = null;

function readStored(): string | null {
  return stored;
}

function clearStored(): void {
  stored = null;
}

function Probe() {
  const value = useOneTimeValue(readStored, clearStored);
  return <p>{value ?? EMPTY_TEXT}</p>;
}

function renderInActivity(mode: "visible" | "hidden") {
  return (
    <Activity mode={mode}>
      <Probe />
    </Activity>
  );
}

/** Lets the hook's scheduled dismissal run, if one is pending. */
async function flushTimers(): Promise<void> {
  await act(async () => {
    await vi.runAllTimersAsync();
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  stored = FIRST_VALUE;
});

afterEach(() => {
  stored = null;
  vi.useRealTimers();
});

describe("useOneTimeValue", () => {
  // implements FR-3, FR-6 of delete-poem
  it("shows the snapshot taken on the first render and clears the store", async () => {
    render(<Probe />);
    await flushTimers();

    expect(screen.getByText(FIRST_VALUE)).toBeInTheDocument();
    expect(stored).toBeNull();
  });

  it("shows nothing when the store is empty", async () => {
    stored = null;
    render(<Probe />);
    await flushTimers();

    expect(screen.getByText(EMPTY_TEXT)).toBeInTheDocument();
  });

  // implements FR-3 of delete-poem
  it("shows nothing on a second mount: the first one cleared the store", async () => {
    const first = render(<Probe />);
    first.unmount();

    render(<Probe />);
    await flushTimers();

    expect(screen.getByText(EMPTY_TEXT)).toBeInTheDocument();
  });

  it("stays shown under Strict Mode, whose effect re-run finds the store already cleared", async () => {
    render(
      <StrictMode>
        <Probe />
      </StrictMode>,
    );
    await flushTimers();

    expect(screen.getByText(FIRST_VALUE)).toBeInTheDocument();
    expect(stored).toBeNull();
  });

  // implements FR-3, FR-6 of delete-poem
  it("is dismissed once the page is hidden, and stays gone when it shows again", async () => {
    const { rerender } = render(renderInActivity("visible"));
    await flushTimers();
    expect(screen.getByText(FIRST_VALUE)).toBeInTheDocument();

    rerender(renderInActivity("hidden"));
    await flushTimers();
    rerender(renderInActivity("visible"));
    await flushTimers();

    expect(screen.getByText(EMPTY_TEXT)).toBeInTheDocument();
  });

  // implements FR-3 of delete-poem: list → poem → delete reveals the already-visited list (Gate 1 P1)
  it("shows a value written while the page was hidden when it shows again", async () => {
    const { rerender } = render(renderInActivity("visible"));
    await flushTimers();

    rerender(renderInActivity("hidden"));
    await flushTimers();
    stored = SECOND_VALUE;
    rerender(renderInActivity("visible"));
    await flushTimers();

    expect(screen.getByText(SECOND_VALUE)).toBeInTheDocument();
    expect(stored).toBeNull();
  });
});
