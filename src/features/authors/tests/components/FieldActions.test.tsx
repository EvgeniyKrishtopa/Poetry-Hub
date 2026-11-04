import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type ConnectionStatus, useConnectionStatus } from "@/shared/lib/network/use-connection-status";

import { FieldActions } from "../../components/FieldActions/FieldActions";
import type { FieldActionsProps } from "../../components/FieldActions/FieldActions.types";

vi.mock("@/shared/lib/network/use-connection-status", () => ({ useConnectionStatus: vi.fn() }));

const ADD_PROMPT = "Добавить имя";

function props(overrides: Partial<FieldActionsProps> = {}): FieldActionsProps {
  return {
    hasValue: true,
    pendingKind: null,
    disabled: false,
    addPrompt: ADD_PROMPT,
    describedBy: undefined,
    focusOnMount: false,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
}

function setConnection(status: ConnectionStatus) {
  vi.mocked(useConnectionStatus).mockReturnValue(status);
}

beforeEach(() => {
  setConnection("online");
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("FieldActions", () => {
  // implements FR-11 of edit-poem
  it.each(["offline", "slow"] as const)("disables «Удалить» while %s and keeps «Изменить» enabled", (status) => {
    setConnection(status);
    render(<FieldActions {...props()} />);

    expect(screen.getByRole("button", { name: "Удалить" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Изменить" })).toBeEnabled();
  });

  // implements FR-11 of edit-poem
  it("keeps the add prompt of an empty field enabled while offline", () => {
    setConnection("offline");
    render(<FieldActions {...props({ hasValue: false })} />);

    expect(screen.getByRole("button", { name: ADD_PROMPT })).toBeEnabled();
  });

  // implements FR-11 of edit-poem
  it("enables «Удалить» again when the connection returns", () => {
    setConnection("offline");
    const { rerender } = render(<FieldActions {...props()} />);

    setConnection("online");
    rerender(<FieldActions {...props()} />);

    expect(screen.getByRole("button", { name: "Удалить" })).toBeEnabled();
  });
});
