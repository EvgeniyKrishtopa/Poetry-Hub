import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useLeaveBlock } from "@/shared/lib/leave-guard/leave-block.store";
import { LEAVE_ANSWER, type LeaveAnswer } from "@/shared/lib/leave-guard/leave-guard.constants";

import { signOutAction } from "../../actions/auth.actions";
import { SignOutButton } from "../../components/SignOutButton/SignOutButton";

vi.mock("../../actions/auth.actions", () => ({ signOutAction: vi.fn() }));

type SignOutResult = Awaited<ReturnType<typeof signOutAction>>;

const FAILURE_TEXT = "Не удалось выйти. Попробуйте ещё раз.";

describe("SignOutButton", () => {
  afterEach(() => {
    vi.clearAllMocks();
    useLeaveBlock.getState().setAskToLeave(null);
  });

  // implements FR-4 of remove-browser-session-read
  it("calls the action and shows no alert when sign-out succeeds", async () => {
    let settle: (result: SignOutResult) => void = () => {};
    vi.mocked(signOutAction).mockReturnValue(new Promise((resolve) => (settle = resolve)));
    render(<SignOutButton />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Выйти" }));
    expect(screen.getByRole("button", { name: "Выйти" })).toBeDisabled();
    settle({ data: { ok: true } } as SignOutResult);

    // Enabled again means the transition has settled, so a failure alert would already show.
    await vi.waitFor(() => expect(screen.getByRole("button", { name: "Выйти" })).toBeEnabled());
    expect(signOutAction).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // implements FR-5 of add-feedback-color-tokens
  it.each<[string, () => void]>([
    ["ok: false", () => vi.mocked(signOutAction).mockResolvedValue({ data: { ok: false } } as SignOutResult)],
    ["a serverError", () => vi.mocked(signOutAction).mockResolvedValue({ serverError: "x" } as SignOutResult)],
    ["a rejected call", () => vi.mocked(signOutAction).mockRejectedValue(new TypeError("Failed to fetch"))],
  ])("keeps Sign out and shows the failure inline in danger when sign-out returns %s", async (_label, arrange) => {
    arrange();
    render(<SignOutButton />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Выйти" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(FAILURE_TEXT);
    expect(alert).toHaveClass("text-danger");
    expect(alert.tagName).toBe("P");
    expect(screen.getByRole("button", { name: "Выйти" })).toBeEnabled();
  });

  it("disables Sign out while the sign-out is pending", async () => {
    let settle: (result: SignOutResult) => void = () => {};
    vi.mocked(signOutAction).mockReturnValue(new Promise((resolve) => (settle = resolve)));
    render(<SignOutButton />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Выйти" }));

    expect(screen.getByRole("button", { name: "Выйти" })).toBeDisabled();
    // React entangles pending async transitions, so a never-settling one would keep later tests pending.
    settle({ data: { ok: true } } as SignOutResult);
    await vi.waitFor(() => expect(screen.getByRole("button", { name: "Выйти" })).toBeEnabled());
  });

  describe("while an edit form has unsaved changes", () => {
    /** A page guard whose question the test answers as the author would. */
    function guardWithQuestion() {
      let answer: (value: LeaveAnswer) => void = () => {};
      const askToLeave = vi.fn(() => new Promise<LeaveAnswer>((resolve) => (answer = resolve)));
      useLeaveBlock.getState().setAskToLeave(askToLeave);
      return { askToLeave, answer: (value: LeaveAnswer) => answer(value) };
    }

    // implements FR-13 of edit-poem for sign-out
    it("asks the page first and keeps the button enabled while the question is open", async () => {
      const guard = guardWithQuestion();
      render(<SignOutButton />);

      await userEvent.setup().click(screen.getByRole("button", { name: "Выйти" }));

      expect(guard.askToLeave).toHaveBeenCalledTimes(1);
      expect(signOutAction).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Выйти" })).toBeEnabled();
    });

    // implements FR-13, NFR-4 of edit-poem
    it("sends nothing and puts focus back on «Выйти» when the author stays", async () => {
      const guard = guardWithQuestion();
      render(<SignOutButton />);
      const elsewhere = document.createElement("button");
      document.body.append(elsewhere);

      await userEvent.setup().click(screen.getByRole("button", { name: "Выйти" }));
      elsewhere.focus();
      guard.answer(LEAVE_ANSWER.stay);

      await vi.waitFor(() => expect(screen.getByRole("button", { name: "Выйти" })).toHaveFocus());
      expect(signOutAction).not.toHaveBeenCalled();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      elsewhere.remove();
    });

    it("sends nothing and leaves focus alone when the page dismisses the question", async () => {
      const guard = guardWithQuestion();
      render(<SignOutButton />);
      const elsewhere = document.createElement("button");
      document.body.append(elsewhere);

      await userEvent.setup().click(screen.getByRole("button", { name: "Выйти" }));
      elsewhere.focus();
      guard.answer(LEAVE_ANSWER.dismissed);
      // Let the answer travel through the wrapper; a wrong focus() would have run by then.
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(elsewhere).toHaveFocus();
      expect(signOutAction).not.toHaveBeenCalled();
      elsewhere.remove();
    });

    it("signs out once after the author confirms", async () => {
      vi.mocked(signOutAction).mockResolvedValue({ data: { ok: true } } as SignOutResult);
      const guard = guardWithQuestion();
      render(<SignOutButton />);

      await userEvent.setup().click(screen.getByRole("button", { name: "Выйти" }));
      guard.answer(LEAVE_ANSWER.leave);

      await vi.waitFor(() => expect(signOutAction).toHaveBeenCalledTimes(1));
      await vi.waitFor(() => expect(screen.getByRole("button", { name: "Выйти" })).toBeEnabled());
    });

    it("shows the usual failure when the confirmed sign-out fails", async () => {
      vi.mocked(signOutAction).mockResolvedValue({ data: { ok: false } } as SignOutResult);
      const guard = guardWithQuestion();
      render(<SignOutButton />);

      await userEvent.setup().click(screen.getByRole("button", { name: "Выйти" }));
      guard.answer(LEAVE_ANSWER.leave);

      expect(await screen.findByRole("alert")).toHaveTextContent(FAILURE_TEXT);
      expect(screen.getByRole("button", { name: "Выйти" })).toBeEnabled();
    });
  });

  it("clears the alert when a retry succeeds", async () => {
    vi.mocked(signOutAction)
      .mockResolvedValueOnce({ data: { ok: false } } as SignOutResult)
      .mockResolvedValueOnce({ data: { ok: true } } as SignOutResult);
    render(<SignOutButton />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Выйти" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Выйти" }));

    await vi.waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(signOutAction).toHaveBeenCalledTimes(2);
  });
});
