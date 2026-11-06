import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CollectionListNotice } from "../../components/CollectionListNotice/CollectionListNotice";
import { useCollectionListNotice } from "../../model/collection-list-notice-ui.store";

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
  useCollectionListNotice.getState().clearListNotice();
  vi.useRealTimers();
});

describe("CollectionListNotice", () => {
  // implements FR-4, NFR-4 of add-poem-collections
  it("shows the created text with the title as a status, and clears the store", async () => {
    useCollectionListNotice.getState().setListNotice({ kind: "created", title: "Осенний цикл" });

    render(<CollectionListNotice />);
    await flushTimers();

    expect(screen.getByRole("status")).toHaveTextContent(/^Сборник «Осенний цикл» создан\.$/);
    expect(useCollectionListNotice.getState().notice).toBeNull();
  });

  // implements FR-13, NFR-4 of add-poem-collections
  it("shows the deleted text with the title as a status", async () => {
    useCollectionListNotice.getState().setListNotice({ kind: "deleted", title: "Осенний цикл" });

    render(<CollectionListNotice />);
    await flushTimers();

    expect(screen.getByRole("status")).toHaveTextContent(/^Сборник «Осенний цикл» удалён\.$/);
  });

  // implements FR-11, FR-13, NFR-4 of add-poem-collections
  it("shows the already-deleted text as a status", async () => {
    useCollectionListNotice.getState().setListNotice({ kind: "already-deleted" });

    render(<CollectionListNotice />);
    await flushTimers();

    expect(screen.getByRole("status")).toHaveTextContent(/^Сборник уже удалён\.$/);
  });

  // implements FR-4 of add-poem-collections
  it("shows the notice once: a later render, as after a reload, shows nothing", async () => {
    useCollectionListNotice.getState().setListNotice({ kind: "created", title: "Осенний цикл" });
    const first = render(<CollectionListNotice />);
    await flushTimers();
    first.unmount();

    render(<CollectionListNotice />);
    await flushTimers();

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("renders nothing with no notice stored", async () => {
    const { container } = render(<CollectionListNotice />);
    await flushTimers();

    expect(container).toBeEmptyDOMElement();
  });
});
