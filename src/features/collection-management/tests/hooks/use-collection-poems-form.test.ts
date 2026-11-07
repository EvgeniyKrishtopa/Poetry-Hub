import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useConnectionStatus } from "@/shared/lib/network/use-connection-status";

import { saveCollectionPoemsAction } from "../../actions/save-collection-poems.actions";
import { useCollectionPoemsForm } from "../../components/CollectionPoemsForm/use-collection-poems-form";
import type { CollectionPoemChoice, SaveCollectionPoemsOutcome } from "../../model/collection-management.types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("../../actions/save-collection-poems.actions", () => ({ saveCollectionPoemsAction: vi.fn() }));
vi.mock("@/shared/lib/network/use-connection-status", () => ({ useConnectionStatus: vi.fn() }));

type ActionResponse = Awaited<ReturnType<typeof saveCollectionPoemsAction>>;

const COLLECTION_ID = "40000000-0000-4000-8000-000000000031";
const IN_COLLECTION: CollectionPoemChoice = {
  id: "50000000-0000-4000-8000-000000000002",
  title: "Ночной вокзал",
  selected: true,
};
const FREE: CollectionPoemChoice = { id: "50000000-0000-4000-8000-000000000001", title: "Осенний сад", selected: false };
const CHOICES: readonly CollectionPoemChoice[] = [IN_COLLECTION, FREE];
const SAVED: ActionResponse = { data: { status: "saved" } } as ActionResponse;

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
}

function renderForm() {
  return renderHook(() => useCollectionPoemsForm({ collectionId: COLLECTION_ID, choices: CHOICES }));
}

beforeEach(() => {
  vi.mocked(useConnectionStatus).mockReturnValue("online");
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("useCollectionPoemsForm", () => {
  // implements FR-5 of add-poems-to-collections
  it("checks the stored set until a toggle, and derives the change from the draft", () => {
    const { result } = renderForm();
    expect([...result.current.checked]).toEqual([IN_COLLECTION.id]);
    expect(result.current.isChanged).toBe(false);

    act(() => result.current.toggle(FREE.id));

    expect(result.current.checked.has(FREE.id)).toBe(true);
    expect(result.current.isChanged).toBe(true);
    expect(result.current.canSave).toBe(true);
  });

  // implements FR-6 of add-poems-to-collections
  it("sends nothing and answers rejected when there is nothing to save", async () => {
    const { result } = renderForm();

    let outcome: SaveCollectionPoemsOutcome | undefined;
    await act(async () => {
      outcome = await result.current.save();
    });

    expect(outcome).toEqual({ status: "rejected" });
    expect(saveCollectionPoemsAction).not.toHaveBeenCalled();
  });

  // implements FR-6, FR-10 of add-poems-to-collections
  it("lets a second caller join the save already sending instead of sending another", async () => {
    const call = deferred<ActionResponse>();
    vi.mocked(saveCollectionPoemsAction).mockReturnValue(call.promise);
    const { result } = renderForm();
    act(() => result.current.toggle(FREE.id));

    let first: Promise<SaveCollectionPoemsOutcome> = Promise.resolve({ status: "rejected" });
    let second: Promise<SaveCollectionPoemsOutcome> = Promise.resolve({ status: "rejected" });
    act(() => {
      first = result.current.save();
    });
    act(() => {
      second = result.current.save();
    });
    await act(async () => call.resolve(SAVED));

    expect(saveCollectionPoemsAction).toHaveBeenCalledOnce();
    await expect(first).resolves.toEqual({ status: "saved" });
    await expect(second).resolves.toEqual({ status: "saved" });
  });

  // implements FR-10 of add-poems-to-collections: a caller joining after the answer, before it commits
  it("lets a caller join a save that has answered but not yet committed, running its callback at once", async () => {
    const call = deferred<ActionResponse>();
    vi.mocked(saveCollectionPoemsAction).mockReturnValue(call.promise);
    const { result } = renderForm();
    act(() => result.current.toggle(FREE.id));
    act(() => {
      void result.current.save();
    });
    // Still pending in this render: the dialog would open now and join the save.
    const pendingRender = result.current;
    expect(pendingRender.isPending).toBe(true);

    // The answer arrives outside `act`, so React hasn't committed the outcome yet.
    call.resolve(SAVED);
    await Promise.resolve();
    await Promise.resolve();
    const seen = vi.fn();
    const late = pendingRender.save(seen);

    expect(seen).toHaveBeenCalledExactlyOnceWith({ status: "saved" });
    await expect(late).resolves.toEqual({ status: "saved" });
    expect(saveCollectionPoemsAction).toHaveBeenCalledOnce();
    await act(async () => undefined);
    expect(result.current.isPending).toBe(false);
  });

  // implements FR-10 of add-poems-to-collections: a failing callback never leaves a caller waiting
  it("still answers every caller when a callback throws", async () => {
    const call = deferred<ActionResponse>();
    vi.mocked(saveCollectionPoemsAction).mockReturnValue(call.promise);
    const { result } = renderForm();
    act(() => result.current.toggle(FREE.id));
    const failingCallback = () => {
      throw new Error("callback failed");
    };

    let pending: Promise<SaveCollectionPoemsOutcome> = Promise.resolve({ status: "rejected" });
    act(() => {
      pending = result.current.save(failingCallback);
    });
    // The throw surfaces from the transition (React reports it); only the answer to the caller matters here.
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      await act(async () => {
        call.resolve(SAVED);
        await pending;
      });
    } catch {
      // The transition's own rethrow.
    }

    await expect(pending).resolves.toEqual({ status: "saved" });
  });

  // implements FR-10 of add-poems-to-collections: the dialog answers before the form resets (Gate 1 C1)
  it("runs every joined caller's callback with the outcome before the selection resets", async () => {
    const call = deferred<ActionResponse>();
    vi.mocked(saveCollectionPoemsAction).mockReturnValue(call.promise);
    const { result } = renderForm();
    act(() => result.current.toggle(FREE.id));
    const seen: { status: string; changed: boolean }[] = [];
    const record = (outcome: SaveCollectionPoemsOutcome) =>
      seen.push({ status: outcome.status, changed: result.current.isChanged });

    act(() => {
      void result.current.save(record);
    });
    act(() => {
      void result.current.save(record);
    });
    await act(async () => call.resolve(SAVED));

    expect(seen).toEqual([
      { status: "saved", changed: true },
      { status: "saved", changed: true },
    ]);
    expect(result.current.isChanged).toBe(false);
    expect(result.current.hasSaved).toBe(true);
    expect(result.current.showSavedNotice).toBe(true);
  });
});
