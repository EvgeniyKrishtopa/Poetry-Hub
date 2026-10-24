import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Suspense, use, useEffect, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";

import RootError from "../error";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const SECRET_MESSAGE = "secret internal detail";
const DIGEST = "abc123";
const RETRY_LABEL = "Повторить";

function errorWith(message: string, digest?: string): Error & { digest?: string } {
  return Object.assign(new Error(message), digest === undefined ? {} : { digest });
}

function retryButton(): HTMLElement {
  return screen.getByRole("button", { name: RETRY_LABEL });
}

/** A payload that never arrives: suspends forever, as the router does while a refresh is in flight. */
const NEVER_ARRIVES = new Promise<void>(() => {});

function PendingPayload() {
  use(NEVER_ARRIVES);
  return null;
}

/**
 * Renders the screen next to a component the `refresh` mock suspends inside the screen's
 * transition, so the transition stays pending — the way the real router holds it open — until
 * `settleRefresh` clears it with a plain update (the attempt ends with the error screen still shown).
 */
function renderWithPendingRefresh(reset: () => void) {
  type Phase = "idle" | "in-flight" | "settled";
  const control: { setPhase: (phase: Phase) => void } = { setPhase: () => {} };
  const setPhase = (phase: Phase) => control.setPhase(phase);

  function Harness() {
    const [phase, setState] = useState<Phase>("idle");
    useEffect(() => {
      control.setPhase = setState;
    }, []);
    return (
      <>
        <RootError error={errorWith("boom")} reset={reset} retry={vi.fn()} />
        <Suspense fallback={null}>{phase === "in-flight" && <PendingPayload />}</Suspense>
      </>
    );
  }

  refresh.mockImplementation(() => setPhase("in-flight"));

  render(<Harness />);
  return {
    // A new value, not "idle": React skips an update equal to the state already on screen.
    settleRefresh: () =>
      act(() => {
        setPhase("settled");
      }),
  };
}

describe("RootError", () => {
  let consoleErrorSpy: MockInstance<typeof console.error>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    refresh.mockReset();
  });

  // implements FR-2 of add-route-states
  it("shows the error heading and a generic explanation", () => {
    render(<RootError error={errorWith("boom")} reset={vi.fn()} retry={vi.fn()} />);

    expect(screen.getByRole("heading", { level: 1, name: "Что-то пошло не так" })).toBeInTheDocument();
    expect(screen.getByText(/непредвиденная ошибка/i)).toBeInTheDocument();
  });

  // implements FR-3 of add-route-states
  it("never shows the error message, but shows the digest as a reference", () => {
    const { container } = render(
      <RootError error={errorWith(SECRET_MESSAGE, DIGEST)} reset={vi.fn()} retry={vi.fn()} />,
    );

    // innerHTML, not just text nodes: the message must not leak through attributes either.
    expect(container.innerHTML).not.toContain(SECRET_MESSAGE);
    expect(screen.getByText(`Код ошибки: ${DIGEST}`)).toBeInTheDocument();
  });

  it("shows no reference line when the error has no digest", () => {
    render(<RootError error={errorWith("boom")} reset={vi.fn()} retry={vi.fn()} />);

    expect(screen.queryByText(/Код ошибки/)).not.toBeInTheDocument();
  });

  // implements FR-4 of add-route-states, FR-11 of add-author-poems
  it("refreshes the route and resets the boundary once per click, never calling retry", async () => {
    const reset = vi.fn();
    const retry = vi.fn();
    render(<RootError error={errorWith("boom")} reset={reset} retry={retry} />);

    await userEvent.click(retryButton());

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
    expect(retry).not.toHaveBeenCalled();
  });

  // implements FR-11 of add-author-poems
  it("starts nothing more while an attempt is pending, and keeps its label", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    renderWithPendingRefresh(reset);

    await user.click(retryButton());
    await user.click(retryButton());
    await user.keyboard("{Enter}");

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
    expect(retryButton()).toBeDisabled();
    expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
  });

  // implements FR-11 of add-author-poems
  it("enables the button again once the attempt settles with the error still shown", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    const { settleRefresh } = renderWithPendingRefresh(reset);

    // A plain DOM click, outside act: a transition that suspends inside act stays parked in act's
    // queue, and no later update renders, so the settle below would never reach the screen.
    retryButton().click();
    await waitFor(() => expect(retryButton()).toBeDisabled());
    await settleRefresh();

    expect(retryButton()).toBeEnabled();
    expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "false");

    await user.click(retryButton());

    expect(refresh).toHaveBeenCalledTimes(2);
    expect(reset).toHaveBeenCalledTimes(2);
  });

  // implements FR-5 of add-route-states
  it("logs each new error to the console once", () => {
    const first = errorWith("first");
    const second = errorWith("second");
    const { rerender } = render(<RootError error={first} reset={vi.fn()} retry={vi.fn()} />);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenLastCalledWith(first);

    rerender(<RootError error={second} reset={vi.fn()} retry={vi.fn()} />);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy).toHaveBeenLastCalledWith(second);
  });
});
