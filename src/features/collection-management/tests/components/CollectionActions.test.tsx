import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useConnectionStatus } from "@/shared/lib/network/use-connection-status";

import { checkCollectionPoemsAction } from "../../actions/check-collection-poems.actions";
import { CollectionActions } from "../../components/CollectionActions/CollectionActions";
import type { CheckCollectionPoemsResult } from "../../model/collection-management.types";

vi.mock("@/shared/lib/network/use-connection-status", () => ({ useConnectionStatus: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("../../actions/check-collection-poems.actions", () => ({ checkCollectionPoemsAction: vi.fn() }));

type ActionResponse = Awaited<ReturnType<typeof checkCollectionPoemsAction>>;

const COLLECTION_ID = "40000000-0000-4000-8000-000000000031";
const OFFLINE_TEXT = "Нет подключения к интернету. Сохранение станет доступно, когда связь восстановится.";
const SLOW_TEXT = "Медленное подключение к интернету. Сохранение станет доступно, когда связь улучшится.";

function respond(result: CheckCollectionPoemsResult): ActionResponse {
  return { data: result } as ActionResponse;
}

function renderActions(manageCollectionId?: string) {
  return render(
    <CollectionActions
      editButton={<a href="/edit">edit</a>}
      manageCollectionId={manageCollectionId}
      deleteButton={<button type="button">delete</button>}
    />,
  );
}

const manageButton = () => screen.getByRole("button", { name: "Произведения сборника" });

beforeEach(() => {
  vi.mocked(useConnectionStatus).mockReturnValue("online");
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("CollectionActions", () => {
  // implements FR-6 of add-poem-collections
  it("renders the edit and delete slots in one wrapping row with no notice and no manage button", () => {
    renderActions();

    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("button", { name: "Произведения сборника" })).toBeNull();
    const row = screen.getByRole("link", { name: "edit" }).parentElement;
    expect(row).toBe(screen.getByRole("button", { name: "delete" }).parentElement);
    expect(row).toHaveClass("flex-wrap", "gap-2");
  });

  // implements FR-2 of add-poems-to-collections
  it("renders edit, manage, delete in that order in the same row when there is something to manage", () => {
    renderActions(COLLECTION_ID);

    const row = screen.getByRole("link", { name: "edit" }).parentElement as HTMLElement;
    expect(Array.from(row.children).map((child) => child.textContent)).toEqual([
      "edit",
      "Произведения сборника",
      "delete",
    ]);
  });

  // implements FR-14, NFR-4 of add-poem-collections
  it.each([
    ["offline", OFFLINE_TEXT],
    ["slow", SLOW_TEXT],
  ] as const)("while %s, shows the connection notice above the button row", (status, text) => {
    vi.mocked(useConnectionStatus).mockReturnValue(status);

    renderActions(COLLECTION_ID);

    const notice = screen.getByRole("status");
    expect(notice).toHaveTextContent(text);
    const row = screen.getByRole("link", { name: "edit" }).parentElement;
    expect(notice.compareDocumentPosition(row as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(manageButton()).toHaveAttribute("aria-disabled", "true");
  });

  // implements FR-3, NFR-4 of add-poems-to-collections
  it.each<[CheckCollectionPoemsResult, string]>([
    [{ status: "not-found" }, "Сборник уже удалён."],
    [{ status: "nothing-to-manage" }, "Нет свободных произведений для добавления в сборник."],
    [{ status: "failed", failure: "unavailable" }, "Не удалось открыть произведения сборника. Попробуйте позже."],
  ])("shows the check's %o outcome in an alert below the whole row, focus kept on the button", async (result, text) => {
    vi.mocked(checkCollectionPoemsAction).mockResolvedValue(respond(result));
    renderActions(COLLECTION_ID);

    await userEvent.click(manageButton());

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(text);
    const row = screen.getByRole("link", { name: "edit" }).parentElement as HTMLElement;
    expect(row.contains(alert)).toBe(false);
    expect(row.compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(manageButton()).toHaveFocus();
  });

  // implements FR-3 of add-poems-to-collections
  it("clears the alert on the next press", async () => {
    vi.mocked(checkCollectionPoemsAction).mockResolvedValueOnce(respond({ status: "nothing-to-manage" }));
    renderActions(COLLECTION_ID);
    await userEvent.click(manageButton());
    await screen.findByRole("alert");

    let resolve: (value: ActionResponse) => void = () => undefined;
    vi.mocked(checkCollectionPoemsAction).mockReturnValueOnce(
      new Promise<ActionResponse>((onResolve) => {
        resolve = onResolve;
      }),
    );
    await userEvent.click(manageButton());

    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => resolve(respond({ status: "ready" })));
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
