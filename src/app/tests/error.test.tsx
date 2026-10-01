import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";

import RootError from "../error";

const SECRET_MESSAGE = "secret internal detail";
const DIGEST = "abc123";

function errorWith(message: string, digest?: string): Error & { digest?: string } {
  return Object.assign(new Error(message), digest === undefined ? {} : { digest });
}

describe("RootError", () => {
  let consoleErrorSpy: MockInstance<typeof console.error>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  // implements FR-2 of add-route-states
  it("shows the error heading and a generic explanation", () => {
    render(<RootError error={errorWith("boom")} retry={vi.fn()} />);

    expect(screen.getByRole("heading", { level: 1, name: "Something went wrong" })).toBeInTheDocument();
    expect(screen.getByText(/unexpected error occurred/i)).toBeInTheDocument();
  });

  // implements FR-3 of add-route-states
  it("never shows the error message, but shows the digest as a reference", () => {
    const { container } = render(<RootError error={errorWith(SECRET_MESSAGE, DIGEST)} retry={vi.fn()} />);

    // innerHTML, not just text nodes: the message must not leak through attributes either.
    expect(container.innerHTML).not.toContain(SECRET_MESSAGE);
    expect(screen.getByText(`Error reference: ${DIGEST}`)).toBeInTheDocument();
  });

  it("shows no reference line when the error has no digest", () => {
    render(<RootError error={errorWith("boom")} retry={vi.fn()} />);

    expect(screen.queryByText(/Error reference/)).not.toBeInTheDocument();
  });

  // implements FR-4 of add-route-states
  it("calls retry exactly once per click on Try again", async () => {
    const retry = vi.fn();
    render(<RootError error={errorWith("boom")} retry={retry} />);

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(retry).toHaveBeenCalledTimes(1);
  });

  // implements FR-5 of add-route-states
  it("logs each new error to the console once", () => {
    const first = errorWith("first");
    const second = errorWith("second");
    const { rerender } = render(<RootError error={first} retry={vi.fn()} />);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenLastCalledWith(first);

    rerender(<RootError error={second} retry={vi.fn()} />);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy).toHaveBeenLastCalledWith(second);
  });
});
