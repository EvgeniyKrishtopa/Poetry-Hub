import { afterAll, beforeAll } from "vitest";

/**
 * jsdom has no modal dialog: for the calling test file, stands in for `showModal()` and `close()` as the browser
 * does them (open set, then a `close` event on a real close), and puts the native ones back afterwards.
 */
export function stubModalDialog(): void {
  const nativeShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
  const nativeClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");

  beforeAll(() => {
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.open = true;
      },
    });
    Object.defineProperty(HTMLDialogElement.prototype, "close", {
      configurable: true,
      value(this: HTMLDialogElement) {
        if (!this.open) return;
        this.open = false;
        this.dispatchEvent(new Event("close"));
      },
    });
  });

  afterAll(() => {
    if (nativeShowModal) Object.defineProperty(HTMLDialogElement.prototype, "showModal", nativeShowModal);
    if (nativeClose) Object.defineProperty(HTMLDialogElement.prototype, "close", nativeClose);
  });
}
