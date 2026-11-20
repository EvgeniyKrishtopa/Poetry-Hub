import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { stubModalDialog } from "@/shared/ui/tests/stub-modal-dialog";

import { deleteCollectionAction } from "../../actions/delete-collection.actions";
import { deletePoemAction } from "../../actions/delete-poem.actions";
import { AdminDeleteButton } from "../../components/AdminDeleteButton/AdminDeleteButton";
import { ADMIN_DELETE_COPY, ADMIN_DELETE_FAILURE_MESSAGES } from "../../model/admin-messages";
import type { DeleteActionResult } from "../../model/admin.types";
import { useViolationNotice } from "../../model/violation-notice-ui.store";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("../../actions/delete-poem.actions", () => ({ deletePoemAction: vi.fn() }));
vi.mock("../../actions/delete-collection.actions", () => ({ deleteCollectionAction: vi.fn() }));

stubModalDialog();
afterEach(() => {
  vi.clearAllMocks();
  replace.mockReset();
  useViolationNotice.getState().clearFailedNotice();
});

const AUTHOR_PATH = "/authors/11111111-2222-4333-8444-555555555555";
const POEM_ID = "30000000-0000-4000-8000-000000000051";
const COLLECTION_ID = "5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a";

type Response = Awaited<ReturnType<typeof deletePoemAction>>;
const respond = (result: DeleteActionResult): Response => ({ data: result }) as Response;

function renderPoemButton() {
  return render(<AdminDeleteButton kind="poem" id={POEM_ID} title="Осенний сад" redirectHref={AUTHOR_PATH} />);
}

async function openAndConfirm() {
  await userEvent.click(screen.getByRole("button", { name: ADMIN_DELETE_COPY.poem.button }));
  await userEvent.click(screen.getByRole("button", { name: ADMIN_DELETE_COPY.confirm, hidden: false }));
}

describe("AdminDeleteButton", () => {
  // implements FR-10 of admin-moderation
  it("opens a dialog naming the poem and deletes nothing until confirmed", async () => {
    renderPoemButton();

    expect(screen.getByRole("dialog", { hidden: true })).not.toHaveAttribute("open");
    await userEvent.click(screen.getByRole("button", { name: ADMIN_DELETE_COPY.poem.button }));

    expect(screen.getByRole("dialog")).toHaveAttribute("open");
    expect(screen.getByRole("heading", { name: "Удалить произведение «Осенний сад»?" })).toBeInTheDocument();
    expect(screen.getByText(ADMIN_DELETE_COPY.poem.dialogDescription)).toBeInTheDocument();
    expect(deletePoemAction).not.toHaveBeenCalled();
  });

  // implements FR-10 of admin-moderation
  it("deletes nothing on cancel", async () => {
    renderPoemButton();
    await userEvent.click(screen.getByRole("button", { name: ADMIN_DELETE_COPY.poem.button }));

    await userEvent.click(screen.getByRole("button", { name: ADMIN_DELETE_COPY.cancel }));

    expect(screen.getByRole("dialog", { hidden: true })).not.toHaveAttribute("open");
    expect(deletePoemAction).not.toHaveBeenCalled();
    expect(deleteCollectionAction).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  // implements FR-10 of admin-moderation
  it("deletes the poem on confirm and replaces the page with the author's page", async () => {
    vi.mocked(deletePoemAction).mockResolvedValue(respond({ ok: true, notice: { outcome: "sent" } }));
    renderPoemButton();

    await openAndConfirm();

    expect(deletePoemAction).toHaveBeenCalledWith({ id: POEM_ID });
    expect(replace).toHaveBeenCalledWith(AUTHOR_PATH);
    expect(screen.getByRole("dialog", { hidden: true })).not.toHaveAttribute("open");
  });

  // implements FR-14 of admin-violations-feedback
  it("stores a failed email notice before the redirect, so the author page can show it once", async () => {
    let stored: unknown = "not read";
    replace.mockImplementation(() => {
      stored = useViolationNotice.getState().notice;
    });
    vi.mocked(deletePoemAction).mockResolvedValue(
      respond({ ok: true, notice: { outcome: "failed", cause: "no-address" } }),
    );
    renderPoemButton();

    await openAndConfirm();

    expect(replace).toHaveBeenCalledWith(AUTHOR_PATH);
    expect(stored).toEqual({ deleted: "poem", cause: "no-address" });
  });

  // implements FR-14 of admin-violations-feedback
  it("stores nothing for a sent or skipped email", async () => {
    vi.mocked(deleteCollectionAction).mockResolvedValue(respond({ ok: true, notice: { outcome: "sent" } }));
    render(<AdminDeleteButton kind="collection" id={COLLECTION_ID} title="Осенний цикл" redirectHref={AUTHOR_PATH} />);

    await userEvent.click(screen.getByRole("button", { name: ADMIN_DELETE_COPY.collection.button }));
    await userEvent.click(screen.getByRole("button", { name: ADMIN_DELETE_COPY.confirm }));

    expect(replace).toHaveBeenCalledWith(AUTHOR_PATH);
    expect(useViolationNotice.getState().notice).toBeNull();
  });

  // implements FR-10 of admin-moderation
  it("deletes a collection through its own action, with its own wording", async () => {
    vi.mocked(deleteCollectionAction).mockResolvedValue(respond({ ok: true, notice: { outcome: "sent" } }));
    render(<AdminDeleteButton kind="collection" id={COLLECTION_ID} title="Осенний цикл" redirectHref={AUTHOR_PATH} />);

    await userEvent.click(screen.getByRole("button", { name: ADMIN_DELETE_COPY.collection.button }));
    expect(screen.getByRole("heading", { name: "Удалить сборник «Осенний цикл»?" })).toBeInTheDocument();
    expect(screen.getByText(ADMIN_DELETE_COPY.collection.dialogDescription)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: ADMIN_DELETE_COPY.confirm }));

    expect(deleteCollectionAction).toHaveBeenCalledWith({ id: COLLECTION_ID });
    expect(deletePoemAction).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith(AUTHOR_PATH);
  });

  // implements FR-10 of admin-moderation
  it("says the poem is already gone, closes the dialog and stays on the page", async () => {
    vi.mocked(deletePoemAction).mockResolvedValue(respond({ ok: false, reason: "not-found" }));
    renderPoemButton();

    await openAndConfirm();

    expect(await screen.findByText(ADMIN_DELETE_COPY.poem.alreadyGone)).toBeInTheDocument();
    expect(screen.getByRole("dialog", { hidden: true })).not.toHaveAttribute("open");
    expect(replace).not.toHaveBeenCalled();
  });

  // implements FR-10, FR-12 of admin-moderation
  it.each(["forbidden", "unauthenticated", "unavailable", "invalid"] as const)(
    "keeps the dialog open with the %s failure text and navigates nowhere",
    async (reason) => {
      vi.mocked(deletePoemAction).mockResolvedValue(respond({ ok: false, reason }));
      renderPoemButton();

      await openAndConfirm();

      expect(await screen.findByText(ADMIN_DELETE_FAILURE_MESSAGES[reason])).toBeInTheDocument();
      expect(screen.getByRole("dialog")).toHaveAttribute("open");
      expect(replace).not.toHaveBeenCalled();
    },
  );

  // implements FR-12 of admin-moderation
  it("reads a server answer that never arrived as an outage", async () => {
    vi.mocked(deletePoemAction).mockRejectedValue(new Error("network"));
    renderPoemButton();

    await openAndConfirm();

    expect(await screen.findByText(ADMIN_DELETE_COPY.failed)).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  // implements FR-10 of admin-moderation
  it("disables both buttons while the request runs and sends it once", async () => {
    let settle: (value: Response) => void = () => undefined;
    vi.mocked(deletePoemAction).mockReturnValue(new Promise<Response>((resolve) => (settle = resolve)));
    renderPoemButton();
    await userEvent.click(screen.getByRole("button", { name: ADMIN_DELETE_COPY.poem.button }));
    const confirm = screen.getByRole("button", { name: ADMIN_DELETE_COPY.confirm });

    fireEvent.click(confirm);
    fireEvent.click(confirm);

    expect(deletePoemAction).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: ADMIN_DELETE_COPY.cancel })).toBeDisabled();
    expect(confirm).toBeDisabled();
    // An unsettled async transition would keep every later test's transitions pending.
    await act(async () => settle(respond({ ok: false, reason: "unavailable" })));
  });

  // implements FR-10 of admin-moderation
  it("starts a reopened dialog without the previous failure", async () => {
    vi.mocked(deletePoemAction).mockResolvedValue(respond({ ok: false, reason: "unavailable" }));
    renderPoemButton();
    await openAndConfirm();
    await screen.findByText(ADMIN_DELETE_COPY.failed);

    await userEvent.click(screen.getByRole("button", { name: ADMIN_DELETE_COPY.cancel }));
    await userEvent.click(screen.getByRole("button", { name: ADMIN_DELETE_COPY.poem.button }));

    expect(screen.queryByText(ADMIN_DELETE_COPY.failed)).not.toBeInTheDocument();
  });
});
