import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { stubModalDialog } from "@/shared/ui/tests/stub-modal-dialog";

import { useDeleteDialog } from "../../components/AdminDeleteButton/use-delete-dialog";

stubModalDialog();

function renderDialogHook() {
  const dialog = document.createElement("dialog");
  document.body.append(dialog);
  const hook = renderHook(() => useDeleteDialog({ current: dialog }));
  return { dialog, ...hook };
}

describe("useDeleteDialog", () => {
  // implements FR-10 of admin-moderation
  it("opens the dialog as a modal and closes it on cancel", () => {
    const { dialog, result } = renderDialogHook();

    act(() => result.current.openConfirmDialog());
    expect(dialog.open).toBe(true);

    act(() => result.current.closeConfirmDialog());
    expect(dialog.open).toBe(false);
  });

  // implements FR-10 of admin-moderation
  it("marks the page as leaving when it closes before the redirect, and clears the mark on the next open", () => {
    const { dialog, result } = renderDialogHook();
    act(() => result.current.openConfirmDialog());

    act(() => result.current.closeConfirmDialogBeforeNavigation());
    expect(dialog.open).toBe(false);
    expect(result.current.isLeavingPage).toBe(true);

    act(() => result.current.openConfirmDialog());
    expect(result.current.isLeavingPage).toBe(false);
  });
});
