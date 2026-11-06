import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useConnectionStatus } from "@/shared/lib/network/use-connection-status";

import { CollectionActions } from "../../components/CollectionActions/CollectionActions";

vi.mock("@/shared/lib/network/use-connection-status", () => ({ useConnectionStatus: vi.fn() }));

const OFFLINE_TEXT = "Нет подключения к интернету. Сохранение станет доступно, когда связь восстановится.";
const SLOW_TEXT = "Медленное подключение к интернету. Сохранение станет доступно, когда связь улучшится.";

function renderActions() {
  return render(
    <CollectionActions>
      <a href="/edit">edit</a>
      <button type="button">delete</button>
    </CollectionActions>,
  );
}

afterEach(() => {
  vi.resetAllMocks();
});

describe("CollectionActions", () => {
  // implements FR-6 of add-poem-collections
  it("renders its children in one wrapping row with no notice while online", () => {
    vi.mocked(useConnectionStatus).mockReturnValue("online");

    renderActions();

    expect(screen.queryByRole("status")).toBeNull();
    const row = screen.getByRole("link", { name: "edit" }).parentElement;
    expect(row).toBe(screen.getByRole("button", { name: "delete" }).parentElement);
    expect(row).toHaveClass("flex-wrap", "gap-2");
  });

  // implements FR-14, NFR-4 of add-poem-collections
  it.each([
    ["offline", OFFLINE_TEXT],
    ["slow", SLOW_TEXT],
  ] as const)("while %s, shows the connection notice above the button row", (status, text) => {
    vi.mocked(useConnectionStatus).mockReturnValue(status);

    renderActions();

    const notice = screen.getByRole("status");
    expect(notice).toHaveTextContent(text);
    const row = screen.getByRole("link", { name: "edit" }).parentElement;
    expect(notice.compareDocumentPosition(row as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
