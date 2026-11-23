import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stubModalDialog } from "@/shared/ui/tests/stub-modal-dialog";

import { addViolationCaseAction } from "../../actions/add-violation-case.actions";
import { AdminUserRow } from "../../components/AdminUserRow/AdminUserRow";
import { ViolationDndArea } from "../../components/ViolationDndArea/ViolationDndArea";
import {
  ADD_CASE_RESULT_MESSAGES,
  ADMIN_HOME_PAGE_COPY,
  ADMIN_VIOLATION_COPY,
  CASE_FAILURE_MESSAGES,
  GROUND_CHOICE_COPY,
} from "../../model/admin-messages";
import type { AdminUser } from "../../model/admin.types";
import { VIOLATION_DROP_TARGET_ID } from "../../model/violation.constants";
import type { AddCaseActionResult } from "../../model/violation.types";

const dnd = vi.hoisted(() => ({
  onDragEnd: null as null | ((event: unknown) => void),
  isOver: false,
  droppableArgs: [] as unknown[],
}));
vi.mock("@dnd-kit/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@dnd-kit/core")>()),
  DndContext: ({ children, onDragEnd }: { children: ReactNode; onDragEnd: (event: unknown) => void }) => {
    dnd.onDragEnd = onDragEnd;
    return <>{children}</>;
  },
  useDroppable: (args: unknown) => {
    dnd.droppableArgs.push(args);
    return { setNodeRef: () => undefined, isOver: dnd.isOver };
  },
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => undefined,
    setActivatorNodeRef: () => undefined,
    transform: null,
    isDragging: false,
  }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../../actions/add-violation-case.actions", () => ({
  addViolationCaseAction: vi.fn(),
  addViolationCaseForAuthorAction: vi.fn(),
}));
vi.mock("../../actions/block-user.actions", () => ({ blockUserAction: vi.fn() }));
vi.mock("../../actions/unblock-user.actions", () => ({ unblockUserAction: vi.fn() }));
vi.mock("../../actions/revoke-sessions.actions", () => ({ revokeSessionsAction: vi.fn() }));
vi.mock("../../actions/ban-user.actions", () => ({ banUserAction: vi.fn() }));
const connection = vi.hoisted(() => ({ status: "online" as "online" | "offline" }));
vi.mock("@/shared/lib/network/use-connection", () => ({
  useConnection: () => ({ status: connection.status, isOnline: connection.status === "online" }),
}));

stubModalDialog();

beforeEach(() => {
  connection.status = "online";
  dnd.isOver = false;
  dnd.droppableArgs = [];
});
afterEach(() => vi.clearAllMocks());

const USER: AdminUser = {
  id: "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d",
  email: "anna.lis@example.com",
  authorName: "Анна Лис",
  createdAt: "2026-11-12T10:00:00+00:00",
  lastSignInAt: null,
  restriction: null,
};
const OFFLINE_TEXT = "Нет подключения к интернету. Сохранение станет доступно, когда связь восстановится.";

type Response = Awaited<ReturnType<typeof addViolationCaseAction>>;
const respond = (result: AddCaseActionResult): Response => ({ data: result }) as Response;

function renderArea() {
  return render(
    <ViolationDndArea>
      <ul>
        <AdminUserRow user={USER} />
      </ul>
    </ViolationDndArea>,
  );
}

/** What dnd-kit hands `onDragEnd` when a row is dropped on `overId` (or on nothing). */
function drop(overId: string | null, data: unknown = { userId: USER.id, email: USER.email }) {
  act(() => dnd.onDragEnd?.({ over: overId === null ? null : { id: overId }, active: { data: { current: data } } }));
}

// The user row brings its own ban dialog, so the ground choice is found by its heading, open or closed.
function dialog(): HTMLElement {
  const found = screen.getByText(GROUND_CHOICE_COPY.title).closest("dialog");
  if (found === null) throw new Error("the ground choice is not in a dialog");
  return found;
}
const confirm = () => within(dialog()).getByRole("button", { name: GROUND_CHOICE_COPY.confirm, hidden: true });
const cancel = () => within(dialog()).getByRole("button", { name: GROUND_CHOICE_COPY.cancel, hidden: true });

describe("ViolationDndArea", () => {
  // implements FR-3 of admin-violations-feedback
  it("shows the review-list link, leading to /admin/violations, above the user list", () => {
    renderArea();

    const link = screen.getByRole("link", { name: ADMIN_VIOLATION_COPY.listLink });
    expect(link).toHaveAttribute("href", "/admin/violations");
    expect(link.compareDocumentPosition(screen.getByText(USER.email)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // implements FR-9 of home-page-sections: the way from /admin to the home page's chosen lists
  it("shows a link to /admin/home beside the review-list link, above the user list", () => {
    renderArea();

    const link = screen.getByRole("link", { name: ADMIN_HOME_PAGE_COPY.navLink });
    expect(link).toHaveAttribute("href", "/admin/home");
    expect(link.compareDocumentPosition(screen.getByText(USER.email)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // implements FR-3 of admin-violations-feedback
  it("opens the ground choice for the dropped user, who is named in it", () => {
    renderArea();

    drop(VIOLATION_DROP_TARGET_ID);

    expect(dialog()).toHaveAttribute("open");
    expect(within(dialog()).getByText(GROUND_CHOICE_COPY.description(USER.email))).toBeInTheDocument();
    expect(addViolationCaseAction).not.toHaveBeenCalled();
  });

  // implements FR-3 of admin-violations-feedback
  it("adds the dropped user with the chosen ground, closes the dialog and confirms above the link", async () => {
    vi.mocked(addViolationCaseAction).mockResolvedValue(respond({ ok: true, status: "added" }));
    renderArea();
    drop(VIOLATION_DROP_TARGET_ID);
    await userEvent.click(within(dialog()).getByRole("radio", { name: /Злонамеренные действия/, hidden: true }));

    await userEvent.click(confirm());

    expect(addViolationCaseAction).toHaveBeenCalledExactlyOnceWith({
      userId: USER.id,
      ground: "malicious-activity",
      content: undefined,
    });
    expect(await screen.findByText(ADD_CASE_RESULT_MESSAGES.added)).toBeInTheDocument();
    expect(dialog()).not.toHaveAttribute("open");
  });

  // implements FR-3 of admin-violations-feedback
  it("adds nobody when the choice is cancelled after a drop", async () => {
    renderArea();
    drop(VIOLATION_DROP_TARGET_ID);

    await userEvent.click(cancel());

    expect(addViolationCaseAction).not.toHaveBeenCalled();
    expect(dialog()).not.toHaveAttribute("open");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  // implements FR-3 of admin-violations-feedback
  it("says a user already on the list is, after a drop", async () => {
    vi.mocked(addViolationCaseAction).mockResolvedValue(respond({ ok: true, status: "already-in-list" }));
    renderArea();
    drop(VIOLATION_DROP_TARGET_ID);

    await userEvent.click(confirm());

    expect(await screen.findByText(ADD_CASE_RESULT_MESSAGES["already-in-list"])).toBeInTheDocument();
  });

  // implements FR-3 of admin-violations-feedback
  it("gives the same choice and the same result from a row's button as from a drop", async () => {
    vi.mocked(addViolationCaseAction).mockResolvedValue(respond({ ok: true, status: "added" }));
    renderArea();

    await userEvent.click(screen.getByRole("button", { name: ADMIN_VIOLATION_COPY.addButton }));
    expect(within(dialog()).getByText(GROUND_CHOICE_COPY.description(USER.email))).toBeInTheDocument();
    await userEvent.click(confirm());

    expect(addViolationCaseAction).toHaveBeenCalledExactlyOnceWith({
      userId: USER.id,
      ground: "harmful-content",
      content: undefined,
    });
    expect(await screen.findByText(ADD_CASE_RESULT_MESSAGES.added)).toBeInTheDocument();
  });

  // implements FR-3 of admin-violations-feedback
  it.each([
    ["on nothing", null, undefined],
    ["on another target", "somewhere-else", undefined],
    ["something that is not a user row", VIOLATION_DROP_TARGET_ID, { not: "a user" }],
  ])("opens nothing for a drop %s", (_case, overId, data) => {
    renderArea();

    drop(overId, data);

    expect(dialog()).not.toHaveAttribute("open");
  });

  // implements FR-15 of admin-violations-feedback
  it("keeps a failure inside the open dialog, and shows it above the link once the dialog is closed", async () => {
    vi.mocked(addViolationCaseAction).mockResolvedValue(respond({ ok: false, reason: "target-is-admin" }));
    renderArea();
    drop(VIOLATION_DROP_TARGET_ID);

    await userEvent.click(confirm());

    expect(await within(dialog()).findByRole("alert", { hidden: true })).toHaveTextContent(
      CASE_FAILURE_MESSAGES["target-is-admin"],
    );
    expect(dialog()).toHaveAttribute("open");
    await userEvent.click(cancel());
    expect(screen.getByRole("alert")).toHaveTextContent(CASE_FAILURE_MESSAGES["target-is-admin"]);
  });

  // implements FR-15 of admin-violations-feedback
  it("forgets the last result when the choice opens again", async () => {
    vi.mocked(addViolationCaseAction).mockResolvedValue(respond({ ok: true, status: "added" }));
    renderArea();
    drop(VIOLATION_DROP_TARGET_ID);
    await userEvent.click(confirm());
    expect(await screen.findByText(ADD_CASE_RESULT_MESSAGES.added)).toBeInTheDocument();

    drop(VIOLATION_DROP_TARGET_ID);

    expect(screen.queryByText(ADD_CASE_RESULT_MESSAGES.added)).not.toBeInTheDocument();
  });

  // implements FR-15 of admin-violations-feedback
  it("says there is no connection above the link, disables the handle, the button and the drop target, and ignores a drop", () => {
    connection.status = "offline";
    renderArea();

    expect(screen.getAllByText(OFFLINE_TEXT).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: ADMIN_VIOLATION_COPY.addButton })).toBeDisabled();
    expect(screen.getByRole("button", { name: ADMIN_VIOLATION_COPY.grabLabel(USER.email) })).toBeDisabled();
    expect(dnd.droppableArgs.at(-1)).toMatchObject({ id: VIOLATION_DROP_TARGET_ID, disabled: true });
    drop(VIOLATION_DROP_TARGET_ID);
    expect(dialog()).not.toHaveAttribute("open");
  });

  // implements FR-3 of admin-violations-feedback
  it("shows the drop caption on the link while a row is held over it", () => {
    dnd.isOver = true;

    renderArea();

    expect(screen.getByText(ADMIN_VIOLATION_COPY.dropCaption)).toBeInTheDocument();
  });

  // implements FR-3 of admin-violations-feedback
  it("shows no drop caption otherwise", () => {
    renderArea();

    expect(screen.queryByText(ADMIN_VIOLATION_COPY.dropCaption)).not.toBeInTheDocument();
  });
});
