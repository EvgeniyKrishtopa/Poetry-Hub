import { fireEvent, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useLeaveBlock } from "@/shared/lib/leave-guard/leave-block.store";

import { type LeaveGuardOptions, useLeaveGuard } from "../../components/EditPoemForm/use-leave-guard";

const ALLOWED_PATH = "/account/poems/p1";
const BLOCKED_PATH = "/authors";
const MIDDLE_BUTTON = 1;

const isAllowed = (pathname: string) => pathname === ALLOWED_PATH;

function renderGuard(active: boolean, onBlocked = vi.fn()) {
  const options: LeaveGuardOptions = { active, isAllowed, onBlocked };
  const hook = renderHook((props: LeaveGuardOptions) => useLeaveGuard(props), { initialProps: options });
  return { ...hook, onBlocked, options };
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
  useLeaveBlock.getState().setBlock(null);
});

// implements FR-13 of edit-poem
describe("useLeaveGuard", () => {
  describe("while active", () => {
    it("prevents a click on a disallowed same-origin link, hides it from later handlers, and calls onBlocked", () => {
      const { onBlocked } = renderGuard(true);

      const result = click(addLink(BLOCKED_PATH));

      expect(result).toEqual({ followed: false, bubbled: false });
      expect(onBlocked).toHaveBeenCalledTimes(1);
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

    it("registers onBlocked for «Выйти»", () => {
      const { onBlocked } = renderGuard(true);

      expect(useLeaveBlock.getState().block).toBe(onBlocked);
    });
  });

  describe("while inactive", () => {
    it("blocks nothing and registers nothing", () => {
      const { onBlocked } = renderGuard(false);

      expect(click(addLink(BLOCKED_PATH)).followed).toBe(true);
      expect(unloadPrevented()).toBe(false);
      expect(onBlocked).not.toHaveBeenCalled();
      expect(useLeaveBlock.getState().block).toBeNull();
    });
  });

  it("removes both listeners and its block when it turns inactive", () => {
    const { rerender, onBlocked, options } = renderGuard(true);

    rerender({ ...options, active: false });

    expect(click(addLink(BLOCKED_PATH)).followed).toBe(true);
    expect(unloadPrevented()).toBe(false);
    expect(onBlocked).not.toHaveBeenCalled();
    expect(useLeaveBlock.getState().block).toBeNull();
  });

  it("removes both listeners and its block on unmount", () => {
    const { unmount, onBlocked } = renderGuard(true);

    unmount();

    expect(click(addLink(BLOCKED_PATH)).followed).toBe(true);
    expect(unloadPrevented()).toBe(false);
    expect(onBlocked).not.toHaveBeenCalled();
    expect(useLeaveBlock.getState().block).toBeNull();
  });

  it("leaves a block registered by someone else in place on cleanup", () => {
    const { unmount } = renderGuard(true);
    const otherBlock = vi.fn();
    useLeaveBlock.getState().setBlock(otherBlock);

    unmount();

    expect(useLeaveBlock.getState().block).toBe(otherBlock);
  });
});
