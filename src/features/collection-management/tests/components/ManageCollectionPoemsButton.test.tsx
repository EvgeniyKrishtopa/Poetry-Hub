import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type ConnectionStatus, useConnectionStatus } from "@/shared/lib/network/use-connection-status";
import { useSessionExpiredNotice } from "@/shared/lib/one-time-notice/session-expired-notice.store";

import { checkCollectionPoemsAction } from "../../actions/check-collection-poems.actions";
import { ManageCollectionPoemsButton } from "../../components/ManageCollectionPoemsButton/ManageCollectionPoemsButton";
import type { CheckCollectionPoemsResult } from "../../model/collection-management.types";

const push = vi.fn();
const replace = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace, refresh }) }));
vi.mock("../../actions/check-collection-poems.actions", () => ({ checkCollectionPoemsAction: vi.fn() }));
vi.mock("@/shared/lib/network/use-connection-status", () => ({ useConnectionStatus: vi.fn() }));

type ActionResponse = Awaited<ReturnType<typeof checkCollectionPoemsAction>>;

const COLLECTION_ID = "40000000-0000-4000-8000-000000000031";

function setConnection(status: ConnectionStatus) {
  vi.mocked(useConnectionStatus).mockReturnValue(status);
}

function respond(result: CheckCollectionPoemsResult | undefined): ActionResponse {
  return { data: result } as ActionResponse;
}

function renderButton() {
  const onError = vi.fn();
  render(<ManageCollectionPoemsButton collectionId={COLLECTION_ID} onError={onError} />);
  return { onError, button: screen.getByRole("button", { name: "Произведения сборника" }) };
}

beforeEach(() => {
  setConnection("online");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  useSessionExpiredNotice.getState().clearSessionExpired();
});

describe("ManageCollectionPoemsButton", () => {
  // implements FR-2 of add-poems-to-collections
  it("is a ghost button «Произведения сборника», enabled while online", () => {
    const { button } = renderButton();

    expect(button).toHaveClass("ghost");
    expect(button).not.toHaveAttribute("aria-disabled");
  });

  // implements FR-3 of add-poems-to-collections
  it("checks the collection, clears the previous alert, then pushes the collection poems page on ready", async () => {
    vi.mocked(checkCollectionPoemsAction).mockResolvedValue(respond({ status: "ready" }));
    const { onError, button } = renderButton();

    await userEvent.click(button);

    expect(checkCollectionPoemsAction).toHaveBeenCalledExactlyOnceWith({ collectionId: COLLECTION_ID });
    expect(onError).toHaveBeenCalledExactlyOnceWith(null);
    await waitFor(() => expect(push).toHaveBeenCalledExactlyOnceWith(`/account/poems/collections/${COLLECTION_ID}/poems`));
    expect(replace).not.toHaveBeenCalled();
  });

  // implements FR-3 of add-poems-to-collections
  it.each<[string, CheckCollectionPoemsResult | undefined, string]>([
    ["not-found", { status: "not-found" }, "not-found"],
    ["nothing-to-manage", { status: "nothing-to-manage" }, "nothing-to-manage"],
    ["failed: unavailable", { status: "failed", failure: "unavailable" }, "unavailable"],
    ["failed: unknown", { status: "failed", failure: "unknown" }, "unavailable"],
    ["no data", undefined, "unavailable"],
  ])("reports %s to the row and keeps focus on the button", async (_label, result, error) => {
    vi.mocked(checkCollectionPoemsAction).mockResolvedValue(respond(result));
    const { onError, button } = renderButton();

    await userEvent.click(button);

    await waitFor(() => expect(onError).toHaveBeenLastCalledWith(error));
    expect(push).not.toHaveBeenCalled();
    expect(button).toHaveFocus();
    await waitFor(() => expect(button).not.toHaveAttribute("aria-disabled"));
  });

  // implements FR-3 of add-poems-to-collections
  it("reports unavailable when the call is rejected online, logging only the error's type", async () => {
    vi.mocked(checkCollectionPoemsAction).mockRejectedValue(new TypeError(`fetch ${COLLECTION_ID}`));
    const { onError, button } = renderButton();

    await userEvent.click(button);

    await waitFor(() => expect(onError).toHaveBeenLastCalledWith("unavailable"));
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[collection-management] poems check rejected: TypeError");
  });

  // implements FR-9 of add-poems-to-collections
  it("shows no alert for a call rejected after the connection dropped", async () => {
    let reject: (reason: Error) => void = () => undefined;
    vi.mocked(checkCollectionPoemsAction).mockReturnValue(
      new Promise<ActionResponse>((_resolve, onReject) => {
        reject = onReject;
      }),
    );
    const onError = vi.fn();
    const { rerender } = render(<ManageCollectionPoemsButton collectionId={COLLECTION_ID} onError={onError} />);

    await userEvent.click(screen.getByRole("button", { name: "Произведения сборника" }));
    // The connection hook re-renders the button with the new status while the call is still pending.
    setConnection("offline");
    rerender(<ManageCollectionPoemsButton collectionId={COLLECTION_ID} onError={onError} />);
    await act(async () => reject(new TypeError("Failed to fetch")));

    expect(onError).toHaveBeenCalledExactlyOnceWith(null);
  });

  // implements FR-3 of add-poems-to-collections
  it("on a lost session, marks it expired and replaces the page with /login, then refreshes", async () => {
    vi.mocked(checkCollectionPoemsAction).mockResolvedValue(respond({ status: "failed", failure: "unauthenticated" }));
    const { onError, button } = renderButton();

    await userEvent.click(button);

    await waitFor(() => expect(replace).toHaveBeenCalledExactlyOnceWith("/login"));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(useSessionExpiredNotice.getState().expired).toBe(true);
    expect(onError).toHaveBeenCalledExactlyOnceWith(null);
  });

  // implements FR-3 of add-poems-to-collections
  it("is aria-disabled while the check is pending and sends nothing on a second press", async () => {
    let resolve: (value: ActionResponse) => void = () => undefined;
    vi.mocked(checkCollectionPoemsAction).mockReturnValue(
      new Promise<ActionResponse>((onResolve) => {
        resolve = onResolve;
      }),
    );
    const { button } = renderButton();

    await userEvent.click(button);
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveFocus();
    await userEvent.click(button);

    expect(checkCollectionPoemsAction).toHaveBeenCalledTimes(1);
    await act(async () => resolve(respond({ status: "nothing-to-manage" })));
    expect(button).not.toHaveAttribute("aria-disabled");
  });

  // implements FR-9, NFR-4 of add-poems-to-collections
  it.each(["offline", "slow"] as const)("is aria-disabled, focusable, and ignores a press while %s", async (status) => {
    setConnection(status);
    const { onError, button } = renderButton();

    await userEvent.click(button);

    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).not.toBeDisabled();
    expect(button).toHaveFocus();
    expect(checkCollectionPoemsAction).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });
});
