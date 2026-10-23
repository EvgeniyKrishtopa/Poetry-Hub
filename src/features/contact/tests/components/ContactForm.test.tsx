import { render, screen, waitFor } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sendContactMessageAction } from "../../actions/contact.actions";
import { ContactForm } from "../../components/ContactForm/ContactForm";
import { HONEYPOT_FIELD, MESSAGE_MAX_LENGTH, NAME_MAX_LENGTH } from "../../model/contact.constants";
import { CONTACT_COPY, CONTACT_FIELD_ERRORS } from "../../model/contact-messages";

vi.mock("../../actions/contact.actions", () => ({
  sendContactMessageAction: vi.fn(),
}));

type ActionResult = Awaited<ReturnType<typeof sendContactMessageAction>>;

const NAME = "Анна";
const EMAIL = "anna@example.com";
const MESSAGE = "Здравствуйте!";
const SECRET_IN_ERROR = "anna@example.com leaked";

const nameInput = () => screen.getByLabelText(CONTACT_COPY.nameLabel);
const emailInput = () => screen.getByLabelText(CONTACT_COPY.emailLabel);
const messageInput = () => screen.getByLabelText(CONTACT_COPY.messageLabel);
const submitButton = () => screen.getByRole("button", { name: CONTACT_COPY.submit });

async function fill(user: UserEvent, values: { name?: string; email?: string; message?: string }) {
  if (values.name) await user.type(nameInput(), values.name);
  if (values.email) await user.type(emailInput(), values.email);
  if (values.message) await user.type(messageInput(), values.message);
}

/** An action call that stays pending until the returned `resolve` is called. */
function holdAction() {
  let resolve: (result: ActionResult) => void = () => {};
  vi.mocked(sendContactMessageAction).mockReturnValue(new Promise((done) => (resolve = done)));
  return (result: ActionResult) => resolve(result);
}

function renderForm() {
  const onClose = vi.fn();
  const onSent = vi.fn();
  render(<ContactForm onClose={onClose} onSent={onSent} />);
  return { onClose, onSent, user: userEvent.setup() };
}

describe("ContactForm", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleError.mockRestore();
  });

  // implements FR-3 of add-contact-form
  it("renders the labelled fields in order, a submit button, and no alert", () => {
    renderForm();

    expect(nameInput()).toHaveAttribute("type", "text");
    expect(nameInput()).toHaveAttribute("autocomplete", "name");
    expect(emailInput()).toHaveAttribute("type", "email");
    expect(emailInput()).toHaveAttribute("autocomplete", "email");
    expect(messageInput().tagName).toBe("TEXTAREA");
    expect(nameInput().closest("form")).toHaveAttribute("novalidate");
    expect(submitButton()).toBeEnabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // implements FR-5 of add-contact-form
  it("shows the name and email errors in the browser, calls no action, and focuses «Имя»", async () => {
    const { user } = renderForm();

    await fill(user, { name: "   ", email: "not-an-email" });
    await user.click(submitButton());

    expect(nameInput()).toHaveAccessibleDescription(CONTACT_FIELD_ERRORS.nameRequired);
    expect(emailInput()).toHaveAccessibleDescription(CONTACT_FIELD_ERRORS.emailInvalid);
    expect(messageInput()).not.toHaveAttribute("aria-invalid");
    expect(sendContactMessageAction).not.toHaveBeenCalled();
    await waitFor(() => expect(nameInput()).toHaveFocus());
  });

  // implements FR-5 of add-contact-form
  it("focuses the first invalid field in form order", async () => {
    const { user } = renderForm();

    await fill(user, { name: NAME });
    await user.click(submitButton());

    await waitFor(() => expect(emailInput()).toHaveFocus());
  });

  // implements FR-5 of add-contact-form
  it("shows the length-limit errors under their fields", async () => {
    const { user } = renderForm();

    await fill(user, { name: "а".repeat(NAME_MAX_LENGTH + 1), email: EMAIL });
    await user.click(messageInput());
    await user.paste("б".repeat(MESSAGE_MAX_LENGTH + 1));
    await user.click(submitButton());

    expect(nameInput()).toHaveAccessibleDescription(CONTACT_FIELD_ERRORS.nameTooLong);
    expect(messageInput()).toHaveAttribute("aria-invalid", "true");
    expect(messageInput()).toHaveAccessibleDescription(CONTACT_FIELD_ERRORS.messageTooLong);
    expect(sendContactMessageAction).not.toHaveBeenCalled();
  });

  // implements FR-5 of add-contact-form
  it("sends a valid form with an empty message", async () => {
    vi.mocked(sendContactMessageAction).mockResolvedValue({ data: { status: "sent" } });
    const { user } = renderForm();

    await fill(user, { name: NAME, email: EMAIL });
    await user.click(submitButton());

    expect(sendContactMessageAction).toHaveBeenCalledWith({ name: NAME, email: EMAIL, message: "", [HONEYPOT_FIELD]: "" });
  });

  it("shows the action's own field errors", async () => {
    vi.mocked(sendContactMessageAction).mockResolvedValue({
      validationErrors: { formErrors: [], fieldErrors: { email: [CONTACT_FIELD_ERRORS.emailInvalid] } },
    });
    const { user } = renderForm();

    await fill(user, { name: NAME, email: EMAIL });
    await user.click(submitButton());

    expect(await screen.findByText(CONTACT_FIELD_ERRORS.emailInvalid)).toBeInTheDocument();
    await waitFor(() => expect(emailInput()).toHaveFocus());
  });

  // implements FR-7 of add-contact-form
  it("while pending, shows the sending label, disables the fields and the button, and sends once", async () => {
    const resolve = holdAction();
    const { user } = renderForm();

    await fill(user, { name: NAME, email: EMAIL, message: MESSAGE });
    await user.click(submitButton());

    const pendingButton = await screen.findByRole("button", { name: CONTACT_COPY.submitting });
    expect(pendingButton).toBeDisabled();
    expect(nameInput()).toBeDisabled();
    expect(emailInput()).toBeDisabled();
    expect(messageInput()).toBeDisabled();
    await user.click(pendingButton);
    expect(sendContactMessageAction).toHaveBeenCalledTimes(1);

    resolve({ data: { status: "failed" } });
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  // implements FR-5, FR-7 of add-contact-form
  it("hides the previous field errors from the moment of submit", async () => {
    const resolve = holdAction();
    const { user } = renderForm();

    await fill(user, { email: EMAIL });
    await user.click(submitButton());
    expect(screen.getByText(CONTACT_FIELD_ERRORS.nameRequired)).toBeInTheDocument();

    await fill(user, { name: NAME });
    await user.click(submitButton());

    await screen.findByRole("button", { name: CONTACT_COPY.submitting });
    expect(screen.queryByText(CONTACT_FIELD_ERRORS.nameRequired)).not.toBeInTheDocument();
    resolve({ data: { status: "sent" } });
    expect(await screen.findByRole("status")).toBeInTheDocument();
  });

  // implements FR-8 of add-contact-form
  it("replaces the form with the thank-you view, tells the dialog once, and closes from it", async () => {
    vi.mocked(sendContactMessageAction).mockResolvedValue({ data: { status: "sent" } });
    const { user, onSent, onClose } = renderForm();

    await fill(user, { name: NAME, email: EMAIL });
    await user.click(submitButton());

    expect(await screen.findByRole("status")).toHaveTextContent(CONTACT_COPY.sent);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(onSent).toHaveBeenCalledTimes(1);

    const close = screen.getByRole("button", { name: CONTACT_COPY.close });
    expect(close).toHaveFocus();
    await user.click(close);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // implements FR-9 of add-contact-form
  it("shows the failure alert, keeps the values, focuses «Отправить», and hides the alert on the next submit", async () => {
    vi.mocked(sendContactMessageAction).mockResolvedValue({ data: { status: "failed" } });
    const { user } = renderForm();

    await fill(user, { name: NAME, email: EMAIL, message: MESSAGE });
    await user.click(submitButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(CONTACT_COPY.sendFailed);
    expect(nameInput()).toHaveValue(NAME);
    expect(emailInput()).toHaveValue(EMAIL);
    expect(messageInput()).toHaveValue(MESSAGE);
    await waitFor(() => expect(submitButton()).toHaveFocus());

    const resolve = holdAction();
    await user.click(submitButton());
    await screen.findByRole("button", { name: CONTACT_COPY.submitting });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    resolve({ data: { status: "sent" } });
    expect(await screen.findByRole("status")).toBeInTheDocument();
  });

  it("shows the failure alert for a serverError", async () => {
    vi.mocked(sendContactMessageAction).mockResolvedValue({ serverError: "generic" });
    const { user } = renderForm();

    await fill(user, { name: NAME, email: EMAIL });
    await user.click(submitButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(CONTACT_COPY.sendFailed);
  });

  // implements FR-9 of add-contact-form
  // implements NFR-2 of add-contact-form
  it("turns a rejected action call into the failure alert, keeps the values, and logs only the error's name", async () => {
    vi.mocked(sendContactMessageAction).mockRejectedValue(new TypeError(SECRET_IN_ERROR));
    const { user } = renderForm();

    await fill(user, { name: NAME, email: EMAIL, message: MESSAGE });
    await user.click(submitButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(CONTACT_COPY.sendFailed);
    expect(nameInput()).toHaveValue(NAME);
    expect(messageInput()).toHaveValue(MESSAGE);
    expect(consoleError).toHaveBeenCalledTimes(1);
    const logged = consoleError.mock.calls.flat().join(" ");
    expect(logged).toContain("TypeError");
    for (const value of [SECRET_IN_ERROR, NAME, EMAIL, MESSAGE]) expect(logged).not.toContain(value);
  });

  // implements FR-10 of add-contact-form
  it("hides the honeypot from people and assistive tech", () => {
    const { container } = render(<ContactForm onClose={vi.fn()} onSent={vi.fn()} />);

    const honeypot = container.querySelector(`input[name="${HONEYPOT_FIELD}"]`);
    expect(honeypot).toHaveAttribute("tabindex", "-1");
    expect(honeypot).toHaveAttribute("autocomplete", "off");
    expect(honeypot?.parentElement).toHaveAttribute("aria-hidden", "true");
    expect(honeypot?.parentElement).toHaveClass("sr-only");
  });
});
