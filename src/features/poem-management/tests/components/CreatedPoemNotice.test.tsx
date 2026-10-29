import { act, render, screen } from "@testing-library/react";
import { Activity, StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CreatedPoemNotice } from "../../components/CreatedPoemNotice/CreatedPoemNotice";
import { useCreatedPoemNotice } from "../../model/created-poem-notice-ui.store";

const POEM_ID = "30000000-0000-4000-8000-000000000021";
const OTHER_POEM_ID = "30000000-0000-4000-8000-000000000022";
const CREATED_TEXT = "Поздравляем, Ваше произведение успешно добавлено.";

/** Lets the notice's scheduled dismissal run, if one is pending. */
async function flushTimers(): Promise<void> {
  await act(async () => {
    await vi.runAllTimersAsync();
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  useCreatedPoemNotice.getState().setCreatedPoemId(POEM_ID);
});

afterEach(() => {
  useCreatedPoemNotice.getState().clearCreatedPoemId();
  vi.useRealTimers();
});

describe("CreatedPoemNotice", () => {
  // implements FR-5, NFR-7 of add-poem-creation
  it("shows the success notice as a status for the poem just created, and clears the store", async () => {
    render(<CreatedPoemNotice poemId={POEM_ID} />);
    await flushTimers();

    expect(screen.getByRole("status")).toHaveTextContent(CREATED_TEXT);
    expect(useCreatedPoemNotice.getState().createdPoemId).toBeNull();
  });

  // implements FR-5 of add-poem-creation
  it("stays shown under Strict Mode, whose effect re-run clears the store twice", async () => {
    render(
      <StrictMode>
        <CreatedPoemNotice poemId={POEM_ID} />
      </StrictMode>,
    );
    await flushTimers();

    expect(screen.getByRole("status")).toHaveTextContent(CREATED_TEXT);
    expect(useCreatedPoemNotice.getState().createdPoemId).toBeNull();
  });

  // implements FR-5 of add-poem-creation
  it("shows nothing on a second visit: a new mount finds the store cleared", async () => {
    const first = render(<CreatedPoemNotice poemId={POEM_ID} />);
    first.unmount();

    render(<CreatedPoemNotice poemId={POEM_ID} />);
    await flushTimers();

    expect(screen.queryByRole("status")).toBeNull();
  });

  // implements FR-5 of add-poem-creation
  it("shows nothing on another poem's page", async () => {
    render(<CreatedPoemNotice poemId={OTHER_POEM_ID} />);
    await flushTimers();

    expect(screen.queryByRole("status")).toBeNull();
  });

  // implements FR-5 of add-poem-creation
  it("is dismissed once the page is hidden for Back/Forward, and stays gone when it shows again", async () => {
    const { rerender } = render(
      <Activity mode="visible">
        <CreatedPoemNotice poemId={POEM_ID} />
      </Activity>,
    );
    await flushTimers();
    expect(screen.getByRole("status")).toBeInTheDocument();

    rerender(
      <Activity mode="hidden">
        <CreatedPoemNotice poemId={POEM_ID} />
      </Activity>,
    );
    await flushTimers();
    rerender(
      <Activity mode="visible">
        <CreatedPoemNotice poemId={POEM_ID} />
      </Activity>,
    );
    await flushTimers();

    expect(screen.queryByRole("status")).toBeNull();
  });
});
