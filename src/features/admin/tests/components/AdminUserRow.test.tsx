import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { stubModalDialog } from "@/shared/ui/tests/stub-modal-dialog";

import { banUserAction } from "../../actions/ban-user.actions";
import { blockUserAction } from "../../actions/block-user.actions";
import { revokeSessionsAction } from "../../actions/revoke-sessions.actions";
import { AdminUserRow } from "../../components/AdminUserRow/AdminUserRow";
import { BAN_DIALOG_COPY, MODERATION_FAILURE_MESSAGES, MODERATION_RESULT_MESSAGES } from "../../model/admin-messages";
import type { AdminUser, ModerationActionResult } from "../../model/admin.types";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("../../actions/block-user.actions", () => ({
  blockUserAction: vi.fn(),
}));
vi.mock("../../actions/unblock-user.actions", () => ({
  unblockUserAction: vi.fn(),
}));
vi.mock("../../actions/revoke-sessions.actions", () => ({
  revokeSessionsAction: vi.fn(),
}));
vi.mock("../../actions/ban-user.actions", () => ({ banUserAction: vi.fn() }));

stubModalDialog();
afterEach(() => vi.clearAllMocks());

const USER: AdminUser = {
  id: "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d",
  email: "anna.lis@example.com",
  authorName: "Анна Лис",
  createdAt: "2026-11-12T10:00:00+00:00",
  lastSignInAt: null,
  restriction: null,
  isAdmin: false,
};

type Response = Awaited<ReturnType<typeof blockUserAction>>;
const respond = (result: ModerationActionResult): Response => ({ data: result }) as Response;

function renderRow(user: AdminUser = USER) {
  return render(
    <ul>
      <AdminUserRow user={user} />
    </ul>,
  );
}

describe("AdminUserRow", () => {
  // implements FR-3 of admin-moderation
  it("shows the address, state, author name, joined date and a dash for no sign-in", () => {
    renderRow();

    expect(screen.getByText(USER.email)).toBeInTheDocument();
    expect(screen.getByText("Активен")).toBeInTheDocument();
    expect(screen.getByText("Анна Лис")).toBeInTheDocument();
    expect(screen.getByText("Регистрация: 12 ноября 2026 г.")).toBeInTheDocument();
    expect(screen.getByText("Последний вход: —")).toBeInTheDocument();
  });

  // implements FR-3 of admin-moderation
  it("marks an admin and gives the row no control", () => {
    renderRow({ ...USER, isAdmin: true });

    expect(screen.getByText("Админ")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  // implements FR-4 of admin-moderation
  it("offers a banned row only «Отозвать сессии» and a blocked row «Разблокировать»", () => {
    const { unmount } = renderRow({ ...USER, restriction: "banned" });
    expect(screen.getAllByRole("button", { hidden: true }).map((b) => b.textContent)).not.toContain("Разблокировать");
    expect(screen.getByRole("button", { name: "Отозвать сессии" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Заблокировать" })).not.toBeInTheDocument();
    unmount();

    renderRow({ ...USER, restriction: "blocked" });
    expect(screen.getByRole("button", { name: "Разблокировать" })).toBeInTheDocument();
  });

  // implements FR-12, FR-3 of admin-moderation
  it("blocks with one click, no dialog, shows the result and refreshes the route", async () => {
    vi.mocked(blockUserAction).mockResolvedValue(respond({ ok: true, status: "blocked" }));
    renderRow();

    await userEvent.click(screen.getByRole("button", { name: "Заблокировать" }));

    expect(blockUserAction).toHaveBeenCalledWith({ userId: USER.id });
    expect(await screen.findByText(MODERATION_RESULT_MESSAGES.blocked)).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog", { hidden: true })).not.toHaveAttribute("open");
  });

  // implements FR-6 of admin-moderation
  it("shows the neutral «no sessions» line without a refresh failure", async () => {
    vi.mocked(revokeSessionsAction).mockResolvedValue(respond({ ok: true, status: "no-sessions" }));
    renderRow();

    await userEvent.click(screen.getByRole("button", { name: "Отозвать сессии" }));

    expect(await screen.findByText(MODERATION_RESULT_MESSAGES["no-sessions"])).toBeInTheDocument();
  });

  // implements FR-12 of admin-moderation
  it("shows a failure in the row, changes nothing and does not refresh", async () => {
    vi.mocked(blockUserAction).mockResolvedValue(respond({ ok: false, reason: "target-is-admin" }));
    renderRow();

    await userEvent.click(screen.getByRole("button", { name: "Заблокировать" }));

    expect(await screen.findByText(MODERATION_FAILURE_MESSAGES["target-is-admin"])).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
    expect(screen.getByText("Активен")).toBeInTheDocument();
  });

  // implements FR-12 of admin-moderation
  it("reads a missing answer or a thrown action as the outage text", async () => {
    vi.mocked(blockUserAction).mockRejectedValue(new Error("network"));
    renderRow();

    await userEvent.click(screen.getByRole("button", { name: "Заблокировать" }));

    expect(await screen.findByText(MODERATION_FAILURE_MESSAGES.unavailable)).toBeInTheDocument();
  });

  // implements FR-12 of admin-moderation
  it("disables the row's buttons while an action runs", async () => {
    let settle: (value: Response) => void = () => undefined;
    vi.mocked(blockUserAction).mockReturnValue(new Promise<Response>((resolve) => (settle = resolve)));
    renderRow();

    await userEvent.click(screen.getByRole("button", { name: "Заблокировать" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Заблокировать" })).toBeDisabled());
    await act(async () => settle(respond({ ok: true, status: "blocked" })));
    await waitFor(() => expect(screen.getByRole("button", { name: "Заблокировать" })).toBeEnabled());
  });

  describe("ban dialog", () => {
    const dialog = () => screen.getByRole("dialog", { hidden: true });
    const confirm = () => within(dialog()).getByRole("button", { name: "Забанить", hidden: true });

    // implements FR-12 of admin-moderation
    it("asks first, naming the address, and runs nothing until confirmed", async () => {
      renderRow();

      await userEvent.click(screen.getByRole("button", { name: "Забанить" }));

      expect(within(dialog()).getByText(BAN_DIALOG_COPY.title)).toBeInTheDocument();
      expect(within(dialog()).getByText(BAN_DIALOG_COPY.description(USER.email))).toBeInTheDocument();
      expect(banUserAction).not.toHaveBeenCalled();
    });

    // implements FR-12 of admin-moderation
    it("bans on confirm, closes the dialog and shows the result in the row", async () => {
      vi.mocked(banUserAction).mockResolvedValue(respond({ ok: true, status: "banned" }));
      renderRow();
      await userEvent.click(screen.getByRole("button", { name: "Забанить" }));

      await userEvent.click(confirm());

      expect(banUserAction).toHaveBeenCalledWith({ userId: USER.id });
      expect(await screen.findByText(MODERATION_RESULT_MESSAGES.banned)).toBeInTheDocument();
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(dialog()).not.toHaveAttribute("open");
    });

    // implements FR-12 of admin-moderation
    it("keeps the dialog open and shows the failure inside it", async () => {
      vi.mocked(banUserAction).mockResolvedValue(respond({ ok: false, reason: "unavailable" }));
      renderRow();
      await userEvent.click(screen.getByRole("button", { name: "Забанить" }));

      await userEvent.click(confirm());

      expect(
        await within(dialog()).findByText(MODERATION_FAILURE_MESSAGES.unavailable, { exact: true }),
      ).toBeInTheDocument();
      expect(dialog()).toHaveAttribute("open");
      expect(refresh).not.toHaveBeenCalled();
    });

    // implements FR-12 of admin-moderation
    it("cancel bans nothing", async () => {
      renderRow();
      await userEvent.click(screen.getByRole("button", { name: "Забанить" }));

      await userEvent.click(
        within(dialog()).getByRole("button", {
          name: BAN_DIALOG_COPY.cancel,
          hidden: true,
        }),
      );

      expect(banUserAction).not.toHaveBeenCalled();
      expect(dialog()).not.toHaveAttribute("open");
    });
  });
});
