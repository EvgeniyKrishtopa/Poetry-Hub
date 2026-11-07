import { fireEvent, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { askBeforeLeaving, useLeaveBlock } from "@/shared/lib/leave-guard/leave-block.store";
import { LEAVE_ANSWER, type LeaveAnswer } from "@/shared/lib/leave-guard/leave-guard.constants";

import { type LeaveGuardOptions, useLeaveGuard } from "../../hooks/use-leave-guard";

const ALLOWED_PATH = "/account/poems/collections/c1";
const BLOCKED_PATH = "/authors";
const MIDDLE_BUTTON = 1;

const isAllowed = (pathname: string) => pathname === ALLOWED_PATH;

/** A sign-out question the test answers by hand, as the author would in the dialog. */
function controlledQuestion() {
  let answer: (value: LeaveAnswer) => void = () => {};
  const askToLeave = vi.fn(
    () =>
      new Promise<LeaveAnswer>((resolve) => {
        answer = resolve;
      }),
  );
  return { askToLeave, answer: (value: LeaveAnswer) => answer(value) };
}

function renderGuard(active: boolean, onBlocked = vi.fn()) {
  const question = controlledQuestion();
  const closePrompt = vi.fn();
  const options: LeaveGuardOptions = { active, isAllowed, onBlocked, askToLeave: question.askToLeave, closePrompt };
  const hook = renderHook((props: LeaveGuardOptions) => useLeaveGuard(props), { initialProps: options });
  return { ...hook, onBlocked, options, question, closePrompt };
}

/** Adds a link to the page; the test's click lands on a child span, as with an icon inside a link. */
function addLink(href: string, attributes: Record<string, string> = {}) {
  const link = document.createElement("a");
  link.href = href;
  for (const [name, value] of Object.entries(attributes)) link.setAttribute(name, value);
  const label = document.createElement("span");
  link.append(label);
  document.body.append(link);
  return label;
}

/** Clicks and reports whether the browser would still follow the link and whether a bubble handler saw it. */
function click(target: Element, init: MouseEventInit = {}) {
  const bubbled = vi.fn();
  let followedAtLastHandler: boolean | null = null;
  // The last handler to run: it records the guard's decision, then cancels so jsdom doesn't try to navigate.
  // A click the guard stopped never reaches it; then the dispatch result itself says whether it was cancelled.
  function recordAndCancel(event: Event) {
    followedAtLastHandler = !event.defaultPrevented;
    event.preventDefault();
  }
  document.body.addEventListener("click", bubbled);
  window.addEventListener("click", recordAndCancel);
  const notCancelled = fireEvent.click(target, init);
  document.body.removeEventListener("click", bubbled);
  window.removeEventListener("click", recordAndCancel);
  return { followed: followedAtLastHandler ?? notCancelled, bubbled: bubbled.mock.calls.length > 0 };
}

function unloadPrevented() {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

afterEach(() => {
  document.body.replaceChildren();
  useLeaveBlock.getState().setAskToLeave(null);
});

// The poem guard's tests, repeated for the feature's copy with a collection path (design D12).
// implements FR-12 of add-poem-collections
describe("useLeaveGuard (collection-management)", () => {
  describe("while active", () => {
    it("prevents a click on a disallowed same-origin link, hides it from later handlers, and calls onBlocked", () => {
      const { onBlocked } = renderGuard(true);

      const result = click(addLink(BLOCKED_PATH));

      expect(result).toEqual({ followed: false, bubbled: false });
      expect(onBlocked).toHaveBeenCalledTimes(1);
    });

    // implements FR-10 of add-poems-to-collections
    it("passes onBlocked the clicked link's relative path with its query and hash, never the absolute href", () => {
      const { onBlocked } = renderGuard(true);

      click(addLink(`${window.location.origin}${BLOCKED_PATH}?page=2#poems`));

      expect(onBlocked).toHaveBeenCalledWith(`${BLOCKED_PATH}?page=2#poems`);
    });

    it("lets a link to an allowed path through", () => {
      const { onBlocked } = renderGuard(true);

      expect(click(addLink(`${ALLOWED_PATH}?from=edit`)).followed).toBe(true);
      expect(onBlocked).not.toHaveBeenCalled();
    });

    it.each<[string, () => Element, MouseEventInit]>([
      ["a Cmd click", () => addLink(BLOCKED_PATH), { metaKey: true }],
      ["a Ctrl click", () => addLink(BLOCKED_PATH), { ctrlKey: true }],
      ["a Shift click", () => addLink(BLOCKED_PATH), { shiftKey: true }],
      ["an Alt click", () => addLink(BLOCKED_PATH), { altKey: true }],
      ["a middle click", () => addLink(BLOCKED_PATH), { button: MIDDLE_BUTTON }],
      ['target="_blank"', () => addLink(BLOCKED_PATH, { target: "_blank" }), {}],
      ["a download link", () => addLink(BLOCKED_PATH, { download: "" }), {}],
      ["an external link", () => addLink("https://example.org/authors"), {}],
    ])("lets %s through", (_label, makeTarget, init) => {
      const { onBlocked } = renderGuard(true);

      expect(click(makeTarget(), init).followed).toBe(true);
      expect(onBlocked).not.toHaveBeenCalled();
    });

    it("ignores a link click another handler already cancelled", () => {
      const { onBlocked } = renderGuard(true);
      const label = addLink(BLOCKED_PATH);
      // Capture on window runs before the guard's capture on document.
      const cancelFirst = (event: Event) => event.preventDefault();
      window.addEventListener("click", cancelFirst, { capture: true });

      fireEvent.click(label);
      window.removeEventListener("click", cancelFirst, { capture: true });

      expect(onBlocked).not.toHaveBeenCalled();
    });

    it("ignores a click outside any link", () => {
      const { onBlocked } = renderGuard(true);
      const button = document.createElement("button");
      document.body.append(button);

      expect(click(button).followed).toBe(true);
      expect(onBlocked).not.toHaveBeenCalled();
    });

    it("asks the browser to confirm a close or reload", () => {
      renderGuard(true);

      expect(unloadPrevented()).toBe(true);
    });

    it.each([LEAVE_ANSWER.leave, LEAVE_ANSWER.stay])(
      "registers the sign-out question, answered %s by the author",
      async (choice) => {
        const { question } = renderGuard(true);

        const asked = askBeforeLeaving();
        question.answer(choice);

        await expect(asked).resolves.toBe(choice);
        expect(question.askToLeave).toHaveBeenCalledTimes(1);
      },
    );

    it("answers an earlier pending question dismissed when a second one is asked", async () => {
      const { question } = renderGuard(true);

      const first = askBeforeLeaving();
      const second = askBeforeLeaving();
      question.answer(LEAVE_ANSWER.stay);

      await expect(first).resolves.toBe(LEAVE_ANSWER.dismissed);
      await expect(second).resolves.toBe(LEAVE_ANSWER.stay);
    });

    it("keeps the registration and the open dialog when the callbacks change identity, and asks the latest", async () => {
      const { rerender, options, closePrompt, question } = renderGuard(true);
      const registered = useLeaveBlock.getState().askToLeave;
      const newerAskToLeave = vi.fn(() => Promise.resolve(LEAVE_ANSWER.stay));

      rerender({ ...options, askToLeave: newerAskToLeave, closePrompt: vi.fn() });

      expect(useLeaveBlock.getState().askToLeave).toBe(registered);
      expect(closePrompt).not.toHaveBeenCalled();
      await expect(askBeforeLeaving()).resolves.toBe(LEAVE_ANSWER.stay);
      expect(newerAskToLeave).toHaveBeenCalledTimes(1);
      expect(question.askToLeave).not.toHaveBeenCalled();
    });

    it("keeps one link listener when the callbacks change identity, and calls the latest", () => {
      const add = vi.spyOn(document, "addEventListener");
      const { rerender, options, onBlocked } = renderGuard(true);
      const added = add.mock.calls.length;
      const newerOnBlocked = vi.fn();

      rerender({ ...options, isAllowed: () => false, onBlocked: newerOnBlocked });
      const result = click(addLink(ALLOWED_PATH));

      expect(add.mock.calls.length).toBe(added);
      expect(result.followed).toBe(false);
      expect(newerOnBlocked).toHaveBeenCalledTimes(1);
      expect(onBlocked).not.toHaveBeenCalled();
      add.mockRestore();
    });

    it("answers dismissed when the dialog fails to answer", async () => {
      const { rerender, options } = renderGuard(true);
      rerender({ ...options, askToLeave: () => Promise.reject(new Error("dialog failed")) });

      await expect(askBeforeLeaving()).resolves.toBe(LEAVE_ANSWER.dismissed);
    });
  });

  describe("while inactive", () => {
    it("blocks nothing and registers nothing", () => {
      const { onBlocked } = renderGuard(false);

      expect(click(addLink(BLOCKED_PATH)).followed).toBe(true);
      expect(unloadPrevented()).toBe(false);
      expect(onBlocked).not.toHaveBeenCalled();
      expect(useLeaveBlock.getState().askToLeave).toBeNull();
    });
  });

  it("removes both listeners and its question when it turns inactive, closing the dialog", () => {
    const { rerender, onBlocked, options, closePrompt } = renderGuard(true);

    rerender({ ...options, active: false });

    expect(click(addLink(BLOCKED_PATH)).followed).toBe(true);
    expect(unloadPrevented()).toBe(false);
    expect(onBlocked).not.toHaveBeenCalled();
    expect(useLeaveBlock.getState().askToLeave).toBeNull();
    expect(closePrompt).toHaveBeenCalledTimes(1);
  });

  it("removes both listeners and its question on unmount, closing the dialog", () => {
    const { unmount, onBlocked, closePrompt } = renderGuard(true);

    unmount();

    expect(click(addLink(BLOCKED_PATH)).followed).toBe(true);
    expect(unloadPrevented()).toBe(false);
    expect(onBlocked).not.toHaveBeenCalled();
    expect(useLeaveBlock.getState().askToLeave).toBeNull();
    expect(closePrompt).toHaveBeenCalledTimes(1);
  });

  it.each<[string, (guard: ReturnType<typeof renderGuard>) => void]>([
    ["it turns inactive", ({ rerender, options }) => rerender({ ...options, active: false })],
    ["it unmounts", ({ unmount }) => unmount()],
  ])("answers a pending question dismissed when %s, ignoring a late answer", async (_label, cleanUp) => {
    const guard = renderGuard(true);
    const asked = askBeforeLeaving();

    cleanUp(guard);
    guard.question.answer(LEAVE_ANSWER.leave);

    await expect(asked).resolves.toBe(LEAVE_ANSWER.dismissed);
  });

  it("leaves a question registered by someone else in place on cleanup", () => {
    const { unmount } = renderGuard(true);
    const otherQuestion = vi.fn(() => Promise.resolve(LEAVE_ANSWER.stay));
    useLeaveBlock.getState().setAskToLeave(otherQuestion);

    unmount();

    expect(useLeaveBlock.getState().askToLeave).toBe(otherQuestion);
  });
});
