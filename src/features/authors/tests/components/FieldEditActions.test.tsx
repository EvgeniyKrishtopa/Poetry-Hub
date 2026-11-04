import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type ConnectionStatus, useConnectionStatus } from "@/shared/lib/network/use-connection-status";

import { FieldEditActions } from "../../components/FieldEditActions/FieldEditActions";

vi.mock("@/shared/lib/network/use-connection-status", () => ({ useConnectionStatus: vi.fn() }));

const saveButton = () => screen.getByRole("button", { name: "Сохранить" });
const cancelButton = () => screen.getByRole("button", { name: "Отмена" });

function setConnection(status: ConnectionStatus) {
  vi.mocked(useConnectionStatus).mockReturnValue(status);
}

beforeEach(() => {
  setConnection("online");
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("FieldEditActions", () => {
  // implements FR-11 of edit-poem
  it.each(["offline", "slow"] as const)("disables «Сохранить» while %s and keeps «Отмена» enabled", (status) => {
    setConnection(status);
    render(<FieldEditActions onCancel={vi.fn()} />);

    expect(saveButton()).toBeDisabled();
    expect(cancelButton()).toBeEnabled();
  });

  // implements FR-11 of edit-poem
  it("enables «Сохранить» again when the connection returns", () => {
    setConnection("offline");
    const { rerender } = render(<FieldEditActions onCancel={vi.fn()} />);

    setConnection("online");
    rerender(<FieldEditActions onCancel={vi.fn()} />);

    expect(saveButton()).toBeEnabled();
  });

  // implements FR-11 of edit-poem
  it("keeps «Сохранить» disabled online while the field has nothing to save", () => {
    render(<FieldEditActions onCancel={vi.fn()} canSave={false} />);

    expect(saveButton()).toBeDisabled();
  });
});
