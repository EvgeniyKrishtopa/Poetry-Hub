import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { stubModalDialog } from "@/shared/ui/tests/stub-modal-dialog";

import { banUserAction } from "../../actions/ban-user.actions";
import { blockUserAction } from "../../actions/block-user.actions";
import { revokeSessionsAction } from "../../actions/revoke-sessions.actions";
import { unblockUserAction } from "../../actions/unblock-user.actions";
import { AdminUserRow } from "../../components/AdminUserRow/AdminUserRow";
import { ViolationAddContext } from "../../components/ViolationDndArea/violation-add-context";
import {
  ADMIN_VIOLATION_COPY,
  BAN_DIALOG_COPY,
  MODERATION_FAILURE_MESSAGES,
  MODERATION_RESULT_MESSAGES,
  NOTICE_RESULT_SUFFIX,
} from "../../model/admin-messages";
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
  it.each([null, "blocked", "banned"] as const)("never shows an admin pill, for a row with restriction %s", (restriction) => {
    renderRow({ ...USER, restriction });

    expect(screen.queryByText("Админ")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { hidden: true }).length).toBeGreaterThan(0);
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
    vi.mocked(blockUserAction).mockResolvedValue(respond({ ok: true, status: "blocked", notice: { outcome: "sent" } }));
    renderRow();

    await userEvent.click(screen.getByRole("button", { name: "Заблокировать" }));

    expect(blockUserAction).toHaveBeenCalledWith({ userId: USER.id });
    expect(
      await screen.findByText(`${MODERATION_RESULT_MESSAGES.blocked}${NOTICE_RESULT_SUFFIX.sent}`),
    ).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog", { hidden: true })).not.toHaveAttribute("open");
  });

  // implements FR-14 of admin-violations-feedback
  it.each([
    [{ outcome: "failed", cause: "http" }, NOTICE_RESULT_SUFFIX.failed],
    [{ outcome: "failed", cause: "no-address" }, NOTICE_RESULT_SUFFIX.noAddress],
  ] as const)("says the email was not sent after a block when the notice is %j", async (notice, suffix) => {
    vi.mocked(blockUserAction).mockResolvedValue(respond({ ok: true, status: "blocked", notice }));
    renderRow();

    await userEvent.click(screen.getByRole("button", { name: "Заблокировать" }));

    expect(await screen.findByText(`${MODERATION_RESULT_MESSAGES.blocked}${suffix}`)).toBeInTheDocument();
  });

  // implements FR-4 of admin-moderation
  it("unblocks a blocked row with one click and shows the result", async () => {
    vi.mocked(unblockUserAction).mockResolvedValue(respond({ ok: true, status: "unblocked" }));
    renderRow({ ...USER, restriction: "blocked" });

    await userEvent.click(screen.getByRole("button", { name: "Разблокировать" }));

    expect(unblockUserAction).toHaveBeenCalledWith({ userId: USER.id });
    expect(await screen.findByText(MODERATION_RESULT_MESSAGES.unblocked)).toBeInTheDocument();
  });

  // implements FR-12 of admin-moderation
  it("sends one request when a button is clicked twice before the row disables", async () => {
    let settle: (value: Response) => void = () => undefined;
    vi.mocked(blockUserAction).mockReturnValue(new Promise<Response>((resolve) => (settle = resolve)));
    renderRow();
    const button = screen.getByRole("button", { name: "Заблокировать" });

    fireEvent.click(button);
    fireEvent.click(button);

    expect(blockUserAction).toHaveBeenCalledTimes(1);
    // An unsettled async transition would keep every later test's transitions pending.
    await act(async () => settle(respond({ ok: true, status: "blocked", notice: { outcome: "sent" } })));
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
    await act(async () => settle(respond({ ok: true, status: "blocked", notice: { outcome: "sent" } })));
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
      vi.mocked(banUserAction).mockResolvedValue(respond({ ok: true, status: "banned", notice: { outcome: "sent" } }));
      renderRow();
      await userEvent.click(screen.getByRole("button", { name: "Забанить" }));

      await userEvent.click(confirm());

      expect(banUserAction).toHaveBeenCalledWith({ userId: USER.id });
      expect(
        await screen.findByText(`${MODERATION_RESULT_MESSAGES.banned}${NOTICE_RESULT_SUFFIX.sent}`),
      ).toBeInTheDocument();
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

  describe("inside the review-list area", () => {
    const requestAdd = vi.fn();

    function renderInArea(user: AdminUser, disabled = false) {
      return render(
        <ViolationAddContext value={{ requestAdd, disabled }}>
          <ul>
            <AdminUserRow user={user} />
          </ul>
        </ViolationAddContext>,
      );
    }

    // implements FR-3 of admin-violations-feedback
    it("offers an active row a handle and the add button, between «Отозвать сессии» and «Забанить»", () => {
      renderInArea(USER);

      expect(screen.getByRole("button", { name: ADMIN_VIOLATION_COPY.grabLabel(USER.email) })).toBeInTheDocument();
      const labels = screen.getAllByRole("button").map((button) => button.textContent);
      expect(labels.indexOf(ADMIN_VIOLATION_COPY.addButton)).toBe(labels.indexOf("Отозвать сессии") + 1);
      expect(labels.indexOf("Забанить")).toBe(labels.indexOf(ADMIN_VIOLATION_COPY.addButton) + 1);
    });

    // implements FR-3 of admin-violations-feedback
    it("asks to add this user when the add button is used", async () => {
      renderInArea(USER);

      await userEvent.click(screen.getByRole("button", { name: ADMIN_VIOLATION_COPY.addButton }));

      expect(requestAdd).toHaveBeenCalledExactlyOnceWith({ userId: USER.id, email: USER.email });
    });

    // implements FR-1 of admin-violations-feedback
    it.each(["blocked", "banned"] as const)("gives a %s row neither a handle nor the add button", (restriction) => {
      renderInArea({ ...USER, restriction });

      expect(screen.queryByRole("button", { name: ADMIN_VIOLATION_COPY.addButton })).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: ADMIN_VIOLATION_COPY.grabLabel(USER.email) }),
      ).not.toBeInTheDocument();
    });

    // implements FR-15 of admin-violations-feedback
    it("disables the handle and the add button offline, and leaves the other actions on", () => {
      renderInArea(USER, true);

      expect(screen.getByRole("button", { name: ADMIN_VIOLATION_COPY.addButton })).toBeDisabled();
      expect(screen.getByRole("button", { name: ADMIN_VIOLATION_COPY.grabLabel(USER.email) })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Заблокировать" })).toBeEnabled();
    });

    // implements FR-3 of admin-violations-feedback
    it("has no add controls outside the area", () => {
      renderRow();

      expect(screen.queryByRole("button", { name: ADMIN_VIOLATION_COPY.addButton })).not.toBeInTheDocument();
    });
  });
});
