import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { sendContactMessageAction } from "../../actions/contact.actions";
import { ContactDialog } from "../../components/ContactDialog/ContactDialog";
import { CONTACT_COPY, CONTACT_FIELD_ERRORS } from "../../model/contact-messages";

vi.mock("../../actions/contact.actions", () => ({
  sendContactMessageAction: vi.fn(),
}));

type ActionResult = Awaited<ReturnType<typeof sendContactMessageAction>>;

const TRIGGER_CLASS = "footer-link-class";
const NAME = "Анна";
const EMAIL = "anna@example.com";

// jsdom has no modal dialog: stand in for the parts the component relies on.
const nativeShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
const nativeClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");
const showModal = vi.fn(function (this: HTMLDialogElement) {
  this.open = true;
});
const close = vi.fn(function (this: HTMLDialogElement) {
  if (!this.open) return;
  this.open = false;
  this.dispatchEvent(new Event("close"));
});

const trigger = () => screen.getByRole("button", { name: CONTACT_COPY.trigger });
const dialog = () => screen.getByRole("dialog", { hidden: true });
const nameInput = () => within(dialog()).getByLabelText(CONTACT_COPY.nameLabel);

function renderDialog() {
  render(<ContactDialog triggerClassName={TRIGGER_CLASS} />);
  return userEvent.setup();
}

/** The corner «Закрыть», last in the DOM; the thank-you view adds a second button of that name. */
async function closeWithButton(user: UserEvent) {
  const closeButtons = within(dialog()).getAllByRole("button", { name: CONTACT_COPY.close });
  await user.click(closeButtons[closeButtons.length - 1]);
}

async function submitValid(user: UserEvent) {
  await user.type(nameInput(), NAME);
  await user.type(within(dialog()).getByLabelText(CONTACT_COPY.emailLabel), EMAIL);
  await user.click(within(dialog()).getByRole("button", { name: CONTACT_COPY.submit }));
}

describe("ContactDialog", () => {
  beforeAll(() => {
    if (nativeShowModal === undefined) HTMLDialogElement.prototype.showModal = showModal;
    if (nativeClose === undefined) HTMLDialogElement.prototype.close = close;
  });

  afterAll(() => {
    if (nativeShowModal === undefined) Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
    if (nativeClose === undefined) Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // implements FR-1 of add-contact-form
  it("renders a dialog trigger with the class it was given", () => {
    renderDialog();

    expect(trigger()).toHaveAttribute("type", "button");
    expect(trigger()).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger()).toHaveClass(TRIGGER_CLASS, "cursor-pointer");
    expect(dialog()).not.toHaveAttribute("open");
  });

  // implements FR-1 of add-contact-form
  it("opens a modal dialog named by its heading", async () => {
    const user = renderDialog();

    await user.click(trigger());

    expect(showModal).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog", { name: CONTACT_COPY.title })).toHaveAttribute("open");
  });

  // implements FR-3 of add-contact-form
  it("holds the heading, intro, three fields, and «Отправить» in order, with «Закрыть» present", async () => {
    const user = renderDialog();
    await user.click(trigger());

    const box = within(dialog());
    const ordered = [
      box.getByRole("heading", { name: CONTACT_COPY.title }),
      box.getByText(CONTACT_COPY.intro),
      box.getByRole("textbox", { name: CONTACT_COPY.nameLabel }),
      box.getByRole("textbox", { name: CONTACT_COPY.emailLabel }),
      box.getByRole("textbox", { name: CONTACT_COPY.messageLabel }),
      box.getByRole("button", { name: CONTACT_COPY.submit }),
    ];
    for (let index = 1; index < ordered.length; index += 1) {
      expect(ordered[index - 1].compareDocumentPosition(ordered[index]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(box.getByRole("textbox", { name: CONTACT_COPY.emailLabel })).toHaveAttribute("type", "email");
    expect(box.getByRole("textbox", { name: CONTACT_COPY.messageLabel }).tagName).toBe("TEXTAREA");
    expect(box.getByRole("button", { name: CONTACT_COPY.close })).toBeInTheDocument();
  });

  // implements FR-4 of add-contact-form
  it("closes on «Закрыть» and keeps the typed value and the last errors for the next open", async () => {
    const user = renderDialog();
    await user.click(trigger());
    await user.type(nameInput(), NAME);
    await user.click(within(dialog()).getByRole("button", { name: CONTACT_COPY.submit }));
    expect(within(dialog()).getByText(CONTACT_FIELD_ERRORS.emailInvalid)).toBeInTheDocument();

    await closeWithButton(user);
    expect(dialog()).not.toHaveAttribute("open");

    await user.click(trigger());
    expect(nameInput()).toHaveValue(NAME);
    expect(within(dialog()).getByText(CONTACT_FIELD_ERRORS.emailInvalid)).toBeInTheDocument();
  });

  // implements FR-4 of add-contact-form
  it("closes on a backdrop click but not on a click inside the box", async () => {
    const user = renderDialog();
    await user.click(trigger());
    await user.type(nameInput(), NAME);

    const heading = within(dialog()).getByRole("heading", { name: CONTACT_COPY.title });
    fireEvent.pointerDown(heading);
    fireEvent.click(heading);
    expect(dialog()).toHaveAttribute("open");

    fireEvent.pointerDown(dialog());
    fireEvent.click(dialog());
    expect(dialog()).not.toHaveAttribute("open");

    await user.click(trigger());
    expect(nameInput()).toHaveValue(NAME);
  });

  // implements FR-4 of add-contact-form
  it("stays open when a press starts inside the box and ends on the backdrop", async () => {
    const user = renderDialog();
    await user.click(trigger());

    fireEvent.pointerDown(nameInput());
    fireEvent.click(dialog());

    expect(dialog()).toHaveAttribute("open");
  });

  // implements FR-8 of add-contact-form
  it("shows the thank-you view without the intro, then an empty form after closing", async () => {
    vi.mocked(sendContactMessageAction).mockResolvedValue({ data: { status: "sent" } });
    const user = renderDialog();
    await user.click(trigger());

    await submitValid(user);
    expect(await within(dialog()).findByRole("status")).toHaveTextContent(CONTACT_COPY.sent);
    expect(within(dialog()).queryByText(CONTACT_COPY.intro)).not.toBeInTheDocument();

    await user.click(within(dialog()).getAllByRole("button", { name: CONTACT_COPY.close })[0]);
    expect(dialog()).not.toHaveAttribute("open");

    await user.click(trigger());
    expect(nameInput()).toHaveValue("");
    expect(within(dialog()).getByText(CONTACT_COPY.intro)).toBeInTheDocument();
  });

  // implements FR-8 of add-contact-form
  it("shows a success that arrived while closed on the next open, and an empty form on the open after", async () => {
    let resolve: (result: ActionResult) => void = () => {};
    vi.mocked(sendContactMessageAction).mockReturnValue(new Promise((done) => (resolve = done)));
    const user = renderDialog();
    await user.click(trigger());
    await submitValid(user);
    await closeWithButton(user);

    resolve({ data: { status: "sent" } });
    await user.click(trigger());
    expect(await within(dialog()).findByRole("status")).toHaveTextContent(CONTACT_COPY.sent);

    await closeWithButton(user);
    await user.click(trigger());
    expect(nameInput()).toHaveValue("");
  });
});
