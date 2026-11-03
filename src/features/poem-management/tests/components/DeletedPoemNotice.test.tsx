import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DeletedPoemNotice } from "../../components/DeletedPoemNotice/DeletedPoemNotice";
import { useDeletedPoemNotice } from "../../model/deleted-poem-notice-ui.store";

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
  useDeletedPoemNotice.getState().clearDeletedNotice();
  vi.useRealTimers();
});

describe("DeletedPoemNotice", () => {
  // implements FR-3, NFR-4, NFR-7 of delete-poem
  it("shows the deleted text with the title as a status, and clears the store", async () => {
    useDeletedPoemNotice.getState().setDeletedNotice({ kind: "deleted", title: "Первый снег" });

    render(<DeletedPoemNotice />);
    await flushTimers();

    expect(screen.getByRole("status")).toHaveTextContent(/^Произведение «Первый снег» удалено\.$/);
    expect(useDeletedPoemNotice.getState().notice).toBeNull();
  });

  // implements FR-4, NFR-4, NFR-7 of delete-poem
  it("shows the already-deleted text as a status", async () => {
    useDeletedPoemNotice.getState().setDeletedNotice({ kind: "already-deleted" });

    render(<DeletedPoemNotice />);
    await flushTimers();

    expect(screen.getByRole("status")).toHaveTextContent(/^Произведение уже удалено\.$/);
  });

  // implements FR-3 of delete-poem: shown once
  it("shows nothing on a second visit: a new mount finds the store cleared", async () => {
    useDeletedPoemNotice.getState().setDeletedNotice({ kind: "deleted", title: "Первый снег" });
    const first = render(<DeletedPoemNotice />);
    await flushTimers();
    first.unmount();

    render(<DeletedPoemNotice />);
    await flushTimers();

    expect(screen.queryByRole("status")).toBeNull();
  });

  // implements FR-3 of delete-poem
  it("renders nothing for an empty store", async () => {
    const { container } = render(<DeletedPoemNotice />);
    await flushTimers();

    expect(container).toBeEmptyDOMElement();
  });
});
