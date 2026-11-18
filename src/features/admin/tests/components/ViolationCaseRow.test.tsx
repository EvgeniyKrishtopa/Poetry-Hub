import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stubModalDialog } from "@/shared/ui/tests/stub-modal-dialog";

import { banUserAction } from "../../actions/ban-user.actions";
import { blockUserAction } from "../../actions/block-user.actions";
import { removeViolationCaseAction } from "../../actions/remove-violation-case.actions";
import { setCaseGroundAction } from "../../actions/set-case-ground.actions";
import type { WarnDialogProps } from "../../components/WarnDialog/WarnDialog.types";
import { ViolationCaseRow } from "../../components/ViolationCaseRow/ViolationCaseRow";
import {
  BAN_DIALOG_COPY,
  CASE_ACTION_LABELS,
  CASE_FAILURE_MESSAGES,
  CASE_RESULT_MESSAGES,
  CASE_STATUS_LABELS,
  EARLY_BLOCK_COPY,
  GROUND_COPY,
  MODERATION_FAILURE_MESSAGES,
  MODERATION_RESULT_MESSAGES,
  NOTICE_RESULT_SUFFIX,
  VIOLATIONS_PAGE_COPY,
} from "../../model/admin-messages";
import type { ModerationActionResult } from "../../model/admin.types";
import type { RemoveCaseActionResult, SetCaseGroundActionResult, ViolationCase } from "../../model/violation.types";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("../../actions/block-user.actions", () => ({ blockUserAction: vi.fn() }));
vi.mock("../../actions/ban-user.actions", () => ({ banUserAction: vi.fn() }));
vi.mock("../../actions/set-case-ground.actions", () => ({ setCaseGroundAction: vi.fn() }));
vi.mock("../../actions/remove-violation-case.actions", () => ({ removeViolationCaseAction: vi.fn() }));
const connection = vi.hoisted(() => ({ status: "online" as "online" | "offline" }));
vi.mock("@/shared/lib/network/use-connection", () => ({
  useConnection: () => ({ status: connection.status, isOnline: connection.status === "online" }),
}));
// The warning dialog has its own tests; here it only has to open and say how it ended.
vi.mock("../../components/WarnDialog/WarnDialog", () => ({
  WarnDialog: ({ dialogRef, onSettled, onClose }: WarnDialogProps) => (
    <dialog ref={dialogRef} aria-label="warn" onClose={onClose}>
      <button type="button" onClick={() => settle(dialogRef, () => onSettled({ kind: "sent" }))}>
        stub sent
      </button>
      {(["already-warned", "wrong-ground", "case-not-found", "already-restricted"] as const).map((reason) => (
        <button key={reason} type="button" onClick={() => settle(dialogRef, () => onSettled({ kind: "stopped", reason }))}>
          stub {reason}
        </button>
      ))}
    </dialog>
  ),
}));

function settle(dialogRef: WarnDialogProps["dialogRef"], report: () => void) {
  report();
  dialogRef.current?.close();
}

stubModalDialog();

beforeEach(() => {
  connection.status = "online";
});
afterEach(() => vi.clearAllMocks());

const RENDERED_AT = "2026-11-18T10:00:00.000Z";
const WARNED_2H_AGO = "2026-11-18T08:00:00.000Z";
const WARNED_25H_AGO = "2026-11-17T09:00:00.000Z";
const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const POEM_ID = "30000000-0000-4000-8000-000000000021";
const CASE: ViolationCase = {
  id: "5c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f",
  userId: "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d",
  email: "anna.lis@example.com",
  authorName: "Анна Лис",
  authorProfileId: AUTHOR_ID,
  ground: "harmful-content",
  content: { kind: "poem", id: POEM_ID, title: "Ночной вокзал" },
  createdAt: "2026-11-17T09:00:00+00:00",
  warnedAt: null,
};
const OFFLINE_ROW_DISABLED = [
  CASE_ACTION_LABELS.warn,
  CASE_ACTION_LABELS.switchGround,
  CASE_ACTION_LABELS.block,
  CASE_ACTION_LABELS.ban,
  CASE_ACTION_LABELS.remove,
];

type BlockResponse = Awaited<ReturnType<typeof blockUserAction>>;
type GroundResponse = Awaited<ReturnType<typeof setCaseGroundAction>>;
type RemoveResponse = Awaited<ReturnType<typeof removeViolationCaseAction>>;
const respondModeration = (result: ModerationActionResult): BlockResponse => ({ data: result }) as BlockResponse;
const respondGround = (result: SetCaseGroundActionResult): GroundResponse => ({ data: result }) as GroundResponse;
const respondRemove = (result: RemoveCaseActionResult): RemoveResponse => ({ data: result }) as RemoveResponse;
const BLOCKED: ModerationActionResult = { ok: true, status: "blocked", notice: { outcome: "sent" } };
const BANNED: ModerationActionResult = { ok: true, status: "banned", notice: { outcome: "sent" } };

function renderRow(overrides: Partial<ViolationCase> = {}) {
  return render(
    <ul>
      <ViolationCaseRow violationCase={{ ...CASE, ...overrides }} renderedAt={RENDERED_AT} />
    </ul>,
  );
}

function dialogWithTitle(title: string): HTMLElement {
  const found = screen.getByText(title).closest("dialog");
  if (found === null) throw new Error(`no dialog titled ${title}`);
  return found;
}

const button = (name: string) => screen.getByRole("button", { name });
const queryButton = (name: string) => screen.queryByRole("button", { name });

describe("ViolationCaseRow", () => {
  // implements FR-5 of admin-violations-feedback
  it("shows a waiting case: address, author, status, ground, when it was added, and no deadline", () => {
    renderRow();

    expect(screen.getByText(CASE.email)).toBeInTheDocument();
    expect(screen.getByText("Анна Лис")).toBeInTheDocument();
    expect(screen.getByText(CASE_STATUS_LABELS.waiting)).toBeInTheDocument();
    expect(screen.getByText(GROUND_COPY["harmful-content"].label)).toBeInTheDocument();
    expect(screen.getByText(VIOLATIONS_PAGE_COPY.addedOn("17 ноября 2026 г."))).toBeInTheDocument();
    expect(screen.queryByText(/Срок до/)).not.toBeInTheDocument();
  });

  // implements FR-5 of admin-violations-feedback
  it("shows a warned case with its deadline, 24 hours after the warning, in UTC", () => {
    renderRow({ warnedAt: WARNED_2H_AGO });

    expect(screen.getByText(CASE_STATUS_LABELS.warned)).toBeInTheDocument();
    expect(screen.getByText(VIOLATIONS_PAGE_COPY.deadline("19 ноября 2026 г., 08:00 UTC"))).toBeInTheDocument();
  });

  // implements FR-5 of admin-violations-feedback
  it("shows a case whose deadline passed, still with its deadline", () => {
    renderRow({ warnedAt: WARNED_25H_AGO });

    expect(screen.getByText(CASE_STATUS_LABELS["deadline-passed"])).toBeInTheDocument();
    expect(screen.getByText(VIOLATIONS_PAGE_COPY.deadline("18 ноября 2026 г., 09:00 UTC"))).toBeInTheDocument();
  });

  // implements FR-4 of admin-violations-feedback
  it("links the poem that prompted the case, and a collection the same way", () => {
    const { unmount } = renderRow();
    expect(screen.getByRole("link", { name: "Ночной вокзал" })).toHaveAttribute(
      "href",
      `/authors/${AUTHOR_ID}/poems/${POEM_ID}`,
    );
    unmount();

    renderRow({ content: { kind: "collection", id: POEM_ID, title: "Осенний цикл" } });
    expect(screen.getByRole("link", { name: "Осенний цикл" })).toHaveAttribute(
      "href",
      `/authors/${AUTHOR_ID}/collections/${POEM_ID}`,
    );
  });

  // implements FR-4 of admin-violations-feedback
  it.each([
    ["poem", VIOLATIONS_PAGE_COPY.contentGone.poem],
    ["collection", VIOLATIONS_PAGE_COPY.contentGone.collection],
  ] as const)("says the %s that prompted the case was deleted, with no link", (kind, text) => {
    renderRow({ content: { kind, id: POEM_ID, title: null } });

    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  // implements FR-4 of admin-violations-feedback
  it("says nothing about content when the case recorded none", () => {
    renderRow({ content: null });

    expect(screen.queryByText(/Повод/)).not.toBeInTheDocument();
  });

  // implements FR-6 of admin-violations-feedback
  it("offers the warning only for a harmful-content case that was not warned", () => {
    const { unmount } = renderRow();
    expect(queryButton(CASE_ACTION_LABELS.warn)).toBeInTheDocument();
    unmount();

    const warned = renderRow({ warnedAt: WARNED_2H_AGO });
    expect(queryButton(CASE_ACTION_LABELS.warn)).not.toBeInTheDocument();
    warned.unmount();

    renderRow({ ground: "malicious-activity" });
    expect(queryButton(CASE_ACTION_LABELS.warn)).not.toBeInTheDocument();
  });

  // implements FR-7 of admin-violations-feedback
  it("always offers switching the ground, blocking, banning and removing", () => {
    renderRow({ ground: "malicious-activity", warnedAt: WARNED_25H_AGO });

    for (const label of [
      CASE_ACTION_LABELS.switchGround,
      CASE_ACTION_LABELS.block,
      CASE_ACTION_LABELS.ban,
      CASE_ACTION_LABELS.remove,
    ]) {
      expect(button(label)).toBeEnabled();
    }
  });

  describe("switching the ground", () => {
    // implements FR-7 of admin-violations-feedback
    it.each([
      ["harmful-content", "malicious-activity"],
      ["malicious-activity", "harmful-content"],
    ] as const)("moves a %s case to %s, says so and refreshes", async (ground, next) => {
      vi.mocked(setCaseGroundAction).mockResolvedValue(respondGround({ ok: true }));
      renderRow({ ground });

      await userEvent.click(button(CASE_ACTION_LABELS.switchGround));

      expect(setCaseGroundAction).toHaveBeenCalledExactlyOnceWith({ caseId: CASE.id, ground: next });
      expect(await screen.findByText(CASE_RESULT_MESSAGES.groundChanged)).toBeInTheDocument();
      expect(refresh).toHaveBeenCalledTimes(1);
    });

    // implements FR-15 of admin-violations-feedback
    it("closes the row, with no refresh, when the case is already gone", async () => {
      vi.mocked(setCaseGroundAction).mockResolvedValue(respondGround({ ok: false, reason: "case-not-found" }));
      renderRow();

      await userEvent.click(button(CASE_ACTION_LABELS.switchGround));

      expect(await screen.findByText(CASE_FAILURE_MESSAGES["case-not-found"])).toBeInTheDocument();
      expect(queryButton(CASE_ACTION_LABELS.switchGround)).not.toBeInTheDocument();
      expect(refresh).not.toHaveBeenCalled();
    });

    // implements FR-15 of admin-violations-feedback
    it("keeps the row and its buttons after a failure that leaves the case as it was", async () => {
      vi.mocked(setCaseGroundAction).mockResolvedValue(respondGround({ ok: false, reason: "unauthenticated" }));
      renderRow();

      await userEvent.click(button(CASE_ACTION_LABELS.switchGround));

      expect(await screen.findByText(CASE_FAILURE_MESSAGES.unauthenticated)).toBeInTheDocument();
      expect(button(CASE_ACTION_LABELS.switchGround)).toBeEnabled();
      expect(refresh).not.toHaveBeenCalled();
    });
  });

  describe("removing", () => {
    // implements FR-7 of admin-violations-feedback
    it("removes the case and refreshes, so the row leaves the list", async () => {
      vi.mocked(removeViolationCaseAction).mockResolvedValue(respondRemove({ ok: true }));
      renderRow();

      await userEvent.click(button(CASE_ACTION_LABELS.remove));

      expect(removeViolationCaseAction).toHaveBeenCalledExactlyOnceWith({ caseId: CASE.id });
      await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
      expect(blockUserAction).not.toHaveBeenCalled();
    });

    // implements FR-15 of admin-violations-feedback
    it("says the case is gone, and closes the row, when it was removed in another tab", async () => {
      vi.mocked(removeViolationCaseAction).mockResolvedValue(respondRemove({ ok: false, reason: "case-not-found" }));
      renderRow();

      await userEvent.click(button(CASE_ACTION_LABELS.remove));

      expect(await screen.findByText(CASE_FAILURE_MESSAGES["case-not-found"])).toBeInTheDocument();
      expect(queryButton(CASE_ACTION_LABELS.remove)).not.toBeInTheDocument();
      expect(refresh).not.toHaveBeenCalled();
    });
  });

  describe("blocking", () => {
    // implements FR-8 of admin-violations-feedback
    it("blocks a malicious-activity case on one click, with no dialog, and says the email went out", async () => {
      vi.mocked(blockUserAction).mockResolvedValue(respondModeration(BLOCKED));
      renderRow({ ground: "malicious-activity" });

      await userEvent.click(button(CASE_ACTION_LABELS.block));

      expect(blockUserAction).toHaveBeenCalledExactlyOnceWith({ userId: CASE.userId });
      expect(
        await screen.findByText(`${MODERATION_RESULT_MESSAGES.blocked}${NOTICE_RESULT_SUFFIX.sent}`),
      ).toBeInTheDocument();
      expect(screen.queryByText(EARLY_BLOCK_COPY.title)).not.toBeInTheDocument();
      expect(dialogWithTitle(BAN_DIALOG_COPY.title)).not.toHaveAttribute("open");
    });

    // implements FR-10 of admin-violations-feedback
    it("keeps the row with its message and takes its buttons away, without a refresh, once the case is closed", async () => {
      vi.mocked(blockUserAction).mockResolvedValue(respondModeration(BLOCKED));
      renderRow({ ground: "malicious-activity" });

      await userEvent.click(button(CASE_ACTION_LABELS.block));

      await screen.findByText(`${MODERATION_RESULT_MESSAGES.blocked}${NOTICE_RESULT_SUFFIX.sent}`);
      for (const label of OFFLINE_ROW_DISABLED) expect(queryButton(label)).not.toBeInTheDocument();
      expect(screen.getByText(CASE.email)).toBeInTheDocument();
      expect(refresh).not.toHaveBeenCalled();
    });

    // implements FR-8 of admin-violations-feedback
    it("blocks a harmful-content case on one click once its deadline passed", async () => {
      vi.mocked(blockUserAction).mockResolvedValue(respondModeration(BLOCKED));
      renderRow({ warnedAt: WARNED_25H_AGO });

      await userEvent.click(button(CASE_ACTION_LABELS.block));

      expect(blockUserAction).toHaveBeenCalledTimes(1);
      expect(screen.queryByText(EARLY_BLOCK_COPY.title)).not.toBeInTheDocument();
    });

    // implements FR-8 of admin-violations-feedback
    it("asks first, saying no warning was sent, and blocks only after the admin confirms", async () => {
      vi.mocked(blockUserAction).mockResolvedValue(respondModeration(BLOCKED));
      renderRow();

      await userEvent.click(button(CASE_ACTION_LABELS.block));

      const dialog = dialogWithTitle(EARLY_BLOCK_COPY.title);
      expect(dialog).toHaveAttribute("open");
      expect(within(dialog).getByText(EARLY_BLOCK_COPY.notWarned)).toBeInTheDocument();
      expect(blockUserAction).not.toHaveBeenCalled();

      await userEvent.click(within(dialog).getByRole("button", { name: EARLY_BLOCK_COPY.confirm }));

      expect(blockUserAction).toHaveBeenCalledExactlyOnceWith({ userId: CASE.userId });
      expect(
        await screen.findByText(`${MODERATION_RESULT_MESSAGES.blocked}${NOTICE_RESULT_SUFFIX.sent}`),
      ).toBeInTheDocument();
      await waitFor(() => expect(dialog).not.toHaveAttribute("open"));
    });

    // implements FR-8 of admin-violations-feedback
    it("asks first, naming the deadline, when the warning's period has not passed", async () => {
      renderRow({ warnedAt: WARNED_2H_AGO });

      await userEvent.click(button(CASE_ACTION_LABELS.block));

      const dialog = dialogWithTitle(EARLY_BLOCK_COPY.title);
      expect(within(dialog).getByText(EARLY_BLOCK_COPY.deadlineOpen("19 ноября 2026 г., 08:00 UTC"))).toBeInTheDocument();
      expect(blockUserAction).not.toHaveBeenCalled();
    });

    // implements FR-8 of admin-violations-feedback
    it("blocks nobody when the early confirmation is cancelled", async () => {
      renderRow();
      await userEvent.click(button(CASE_ACTION_LABELS.block));

      await userEvent.click(
        within(dialogWithTitle(EARLY_BLOCK_COPY.title)).getByRole("button", { name: EARLY_BLOCK_COPY.cancel }),
      );

      expect(blockUserAction).not.toHaveBeenCalled();
      expect(dialogWithTitle(EARLY_BLOCK_COPY.title)).not.toHaveAttribute("open");
    });

    // implements FR-14 of admin-violations-feedback
    it.each([
      [{ outcome: "failed", cause: "http" }, NOTICE_RESULT_SUFFIX.failed],
      [{ outcome: "failed", cause: "no-address" }, NOTICE_RESULT_SUFFIX.noAddress],
    ] as const)("says the email was not sent when the notice is %j", async (notice, suffix) => {
      vi.mocked(blockUserAction).mockResolvedValue(respondModeration({ ok: true, status: "blocked", notice }));
      renderRow({ ground: "malicious-activity" });

      await userEvent.click(button(CASE_ACTION_LABELS.block));

      expect(await screen.findByText(`${MODERATION_RESULT_MESSAGES.blocked}${suffix}`)).toBeInTheDocument();
    });

    // implements FR-15 of admin-violations-feedback
    it("says the user is already blocked, and closes the row, when another tab blocked them", async () => {
      vi.mocked(blockUserAction).mockResolvedValue(respondModeration({ ok: false, reason: "already-restricted" }));
      renderRow({ ground: "malicious-activity" });

      await userEvent.click(button(CASE_ACTION_LABELS.block));

      expect(await screen.findByText(MODERATION_FAILURE_MESSAGES["already-restricted"])).toBeInTheDocument();
      expect(queryButton(CASE_ACTION_LABELS.block)).not.toBeInTheDocument();
      expect(refresh).not.toHaveBeenCalled();
    });

    // implements FR-15 of admin-violations-feedback
    it("says the case is gone, in the case's words, when the account was deleted in another tab", async () => {
      vi.mocked(blockUserAction).mockResolvedValue(respondModeration({ ok: false, reason: "not-found" }));
      renderRow({ ground: "malicious-activity" });

      await userEvent.click(button(CASE_ACTION_LABELS.block));

      expect(await screen.findByText(CASE_FAILURE_MESSAGES["case-not-found"])).toBeInTheDocument();
      expect(screen.queryByText(MODERATION_FAILURE_MESSAGES["not-found"])).not.toBeInTheDocument();
      expect(queryButton(CASE_ACTION_LABELS.block)).not.toBeInTheDocument();
    });

    // implements FR-15 of admin-violations-feedback
    it.each([
      ["a server error", { ok: false, reason: "unavailable" } as const, MODERATION_FAILURE_MESSAGES.unavailable],
      ["an ended session", { ok: false, reason: "unauthenticated" } as const, MODERATION_FAILURE_MESSAGES.unauthenticated],
      ["a refused permission", { ok: false, reason: "forbidden" } as const, MODERATION_FAILURE_MESSAGES.forbidden],
    ])("shows %s in the row and leaves the buttons on", async (_case, result, text) => {
      vi.mocked(blockUserAction).mockResolvedValue(respondModeration(result));
      renderRow({ ground: "malicious-activity" });

      await userEvent.click(button(CASE_ACTION_LABELS.block));

      expect(await screen.findByText(text)).toBeInTheDocument();
      await waitFor(() => expect(button(CASE_ACTION_LABELS.block)).toBeEnabled());
      expect(refresh).not.toHaveBeenCalled();
    });

    // implements FR-15 of admin-violations-feedback
    it("reads a thrown action as the outage text", async () => {
      vi.mocked(blockUserAction).mockRejectedValue(new Error("network"));
      renderRow({ ground: "malicious-activity" });

      await userEvent.click(button(CASE_ACTION_LABELS.block));

      expect(await screen.findByText(MODERATION_FAILURE_MESSAGES.unavailable)).toBeInTheDocument();
    });
  });

  describe("banning", () => {
    // implements FR-8 of admin-violations-feedback
    it("always asks, naming the address, and runs nothing until confirmed", async () => {
      renderRow({ ground: "malicious-activity" });

      await userEvent.click(button(CASE_ACTION_LABELS.ban));

      const dialog = dialogWithTitle(BAN_DIALOG_COPY.title);
      expect(dialog).toHaveAttribute("open");
      expect(within(dialog).getByText(BAN_DIALOG_COPY.description(CASE.email))).toBeInTheDocument();
      expect(banUserAction).not.toHaveBeenCalled();
    });

    // implements FR-8 of admin-violations-feedback
    it("adds the early-block line to the confirmation of a harmful-content case with no warning", async () => {
      renderRow();

      await userEvent.click(button(CASE_ACTION_LABELS.ban));

      expect(within(dialogWithTitle(BAN_DIALOG_COPY.title)).getByText(EARLY_BLOCK_COPY.notWarned)).toBeInTheDocument();
    });

    // implements FR-8 of admin-violations-feedback
    it("adds the deadline to the confirmation while the warning's period runs", async () => {
      renderRow({ warnedAt: WARNED_2H_AGO });

      await userEvent.click(button(CASE_ACTION_LABELS.ban));

      expect(
        within(dialogWithTitle(BAN_DIALOG_COPY.title)).getByText(
          EARLY_BLOCK_COPY.deadlineOpen("19 ноября 2026 г., 08:00 UTC"),
        ),
      ).toBeInTheDocument();
    });

    // implements FR-8 of admin-violations-feedback
    it.each([
      ["a malicious-activity case", { ground: "malicious-activity" }],
      ["a harmful-content case whose deadline passed", { warnedAt: WARNED_25H_AGO }],
    ] as const)("adds no early-block line for %s", async (_case, overrides) => {
      renderRow(overrides);

      await userEvent.click(button(CASE_ACTION_LABELS.ban));

      const dialog = dialogWithTitle(BAN_DIALOG_COPY.title);
      expect(within(dialog).queryByText(EARLY_BLOCK_COPY.notWarned)).not.toBeInTheDocument();
      expect(within(dialog).queryByText(/Срок на реакцию/)).not.toBeInTheDocument();
    });

    // implements FR-9 of admin-violations-feedback
    it("bans on confirm, closes the dialog, says the email went out and closes the row", async () => {
      vi.mocked(banUserAction).mockResolvedValue(respondModeration(BANNED));
      renderRow({ ground: "malicious-activity" });
      await userEvent.click(button(CASE_ACTION_LABELS.ban));

      const dialog = dialogWithTitle(BAN_DIALOG_COPY.title);
      await userEvent.click(within(dialog).getByRole("button", { name: BAN_DIALOG_COPY.confirm }));

      expect(banUserAction).toHaveBeenCalledExactlyOnceWith({ userId: CASE.userId });
      expect(
        await screen.findByText(`${MODERATION_RESULT_MESSAGES.banned}${NOTICE_RESULT_SUFFIX.sent}`),
      ).toBeInTheDocument();
      await waitFor(() => expect(dialog).not.toHaveAttribute("open"));
      expect(queryButton(CASE_ACTION_LABELS.ban)).not.toBeInTheDocument();
      expect(refresh).not.toHaveBeenCalled();
    });

    // implements FR-15 of admin-violations-feedback
    it("keeps a failure inside the open dialog, and shows it in the row once the dialog is closed", async () => {
      vi.mocked(banUserAction).mockResolvedValue(respondModeration({ ok: false, reason: "unavailable" }));
      renderRow({ ground: "malicious-activity" });
      await userEvent.click(button(CASE_ACTION_LABELS.ban));
      const dialog = dialogWithTitle(BAN_DIALOG_COPY.title);

      await userEvent.click(within(dialog).getByRole("button", { name: BAN_DIALOG_COPY.confirm }));

      expect(await within(dialog).findByText(MODERATION_FAILURE_MESSAGES.unavailable)).toBeInTheDocument();
      expect(dialog).toHaveAttribute("open");
      expect(screen.getAllByText(MODERATION_FAILURE_MESSAGES.unavailable)).toHaveLength(1);

      await userEvent.click(within(dialog).getByRole("button", { name: BAN_DIALOG_COPY.cancel }));
      expect(screen.getByRole("alert")).toHaveTextContent(MODERATION_FAILURE_MESSAGES.unavailable);
    });

    // implements FR-15 of admin-violations-feedback
    it("closes the dialog and the row when the user was already blocked in another tab", async () => {
      vi.mocked(banUserAction).mockResolvedValue(respondModeration({ ok: false, reason: "already-restricted" }));
      renderRow({ ground: "malicious-activity" });
      await userEvent.click(button(CASE_ACTION_LABELS.ban));
      const dialog = dialogWithTitle(BAN_DIALOG_COPY.title);

      await userEvent.click(within(dialog).getByRole("button", { name: BAN_DIALOG_COPY.confirm }));

      expect(await screen.findByText(MODERATION_FAILURE_MESSAGES["already-restricted"])).toBeInTheDocument();
      await waitFor(() => expect(dialog).not.toHaveAttribute("open"));
      expect(queryButton(CASE_ACTION_LABELS.ban)).not.toBeInTheDocument();
    });
  });

  describe("the warning dialog", () => {
    const openWarn = async () => userEvent.click(button(CASE_ACTION_LABELS.warn));
    const warnDialog = () => screen.getByLabelText("warn", { selector: "dialog" });

    // implements FR-6 of admin-violations-feedback
    it("opens from «Отправить предупреждение»", async () => {
      renderRow();

      await openWarn();

      expect(warnDialog()).toHaveAttribute("open");
    });

    // implements FR-6 of admin-violations-feedback
    it("has no warning dialog for a malicious-activity case", () => {
      renderRow({ ground: "malicious-activity" });

      expect(screen.queryByLabelText("warn", { selector: "dialog" })).not.toBeInTheDocument();
    });

    // implements FR-6 of admin-violations-feedback
    it("says the warning was sent and refreshes the list, so the row shows the deadline", async () => {
      renderRow();
      await openWarn();

      await userEvent.click(within(warnDialog()).getByRole("button", { name: "stub sent" }));

      expect(await screen.findByText(CASE_RESULT_MESSAGES.warned)).toBeInTheDocument();
      expect(refresh).toHaveBeenCalledTimes(1);
    });

    // implements FR-11 of admin-violations-feedback
    it("says a warning was already sent, refreshing the row, when another tab warned first", async () => {
      renderRow();
      await openWarn();

      await userEvent.click(within(warnDialog()).getByRole("button", { name: "stub already-warned" }));

      expect(await screen.findByText(CASE_RESULT_MESSAGES.alreadyWarned)).toBeInTheDocument();
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(button(CASE_ACTION_LABELS.block)).toBeInTheDocument();
    });

    // implements FR-15 of admin-violations-feedback
    it("says the ground changed, refreshing the row, when another tab switched it", async () => {
      renderRow();
      await openWarn();

      await userEvent.click(within(warnDialog()).getByRole("button", { name: "stub wrong-ground" }));

      expect(await screen.findByText(CASE_RESULT_MESSAGES.wrongGround)).toBeInTheDocument();
      expect(refresh).toHaveBeenCalledTimes(1);
    });

    // implements FR-15 of admin-violations-feedback
    it.each([
      ["case-not-found", CASE_FAILURE_MESSAGES["case-not-found"]],
      ["already-restricted", CASE_FAILURE_MESSAGES["already-restricted"]],
    ] as const)("says %s and closes the row, without a refresh", async (reason, text) => {
      renderRow();
      await openWarn();

      await userEvent.click(within(warnDialog()).getByRole("button", { name: `stub ${reason}` }));

      expect(await screen.findByText(text)).toBeInTheDocument();
      expect(queryButton(CASE_ACTION_LABELS.block)).not.toBeInTheDocument();
      expect(refresh).not.toHaveBeenCalled();
    });
  });

  describe("while it works", () => {
    // implements FR-15 of admin-violations-feedback
    it("disables every button offline", () => {
      connection.status = "offline";
      renderRow();

      for (const label of OFFLINE_ROW_DISABLED) expect(button(label)).toBeDisabled();
    });

    // implements FR-15 of admin-violations-feedback
    it("sends one request when a button is clicked twice before the row disables, and disables its buttons meanwhile", async () => {
      let settleCall: (value: BlockResponse) => void = () => undefined;
      vi.mocked(blockUserAction).mockReturnValue(new Promise<BlockResponse>((resolve) => (settleCall = resolve)));
      renderRow({ ground: "malicious-activity" });
      const block = button(CASE_ACTION_LABELS.block);

      fireEvent.click(block);
      fireEvent.click(block);

      expect(blockUserAction).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(button(CASE_ACTION_LABELS.remove)).toBeDisabled());
      // An unsettled async transition would keep every later test's transitions pending.
      await act(async () => settleCall(respondModeration(BLOCKED)));
    });
  });
});
