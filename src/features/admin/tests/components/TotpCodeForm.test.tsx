import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SESSION_UNAVAILABLE_MESSAGE } from "@/shared/ui/ui-messages";

import { verifyTotpCodeAction } from "../../actions/verify-totp-code.actions";
import { TotpCodeForm } from "../../components/TotpCodeForm/TotpCodeForm";
import { ADMIN_VERIFY_COPY } from "../../model/admin-messages";

vi.mock("../../actions/verify-totp-code.actions", () => ({ verifyTotpCodeAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const FACTOR_ID = "5b1f0a52-3a39-4d0e-9f0c-2f0a3b6c9d11";
const INTRO = "intro above the form";

afterEach(() => vi.clearAllMocks());

function renderForm(factorId: string | null = FACTOR_ID) {
  render(
    <TotpCodeForm factorId={factorId}>
      <p>{INTRO}</p>
    </TotpCodeForm>,
  );
}

function field() {
  return screen.getByRole("textbox", { name: ADMIN_VERIFY_COPY.codeLabel });
}

function submitButton() {
  return screen.getByRole("button", { name: ADMIN_VERIFY_COPY.submitButton });
}

async function send(code: string) {
  const user = userEvent.setup();
  await user.type(field(), code);
  await user.click(submitButton());
  return user;
}

describe("TotpCodeForm", () => {
  // implements FR-8, NFR-6 of pre-deploy-security-hardening
  it("is a numeric one-time-code field that sends the code with the factor", async () => {
    vi.mocked(verifyTotpCodeAction).mockResolvedValue({ data: { ok: false, failure: "wrong-code" } });
    renderForm();

    expect(field()).toHaveAttribute("inputmode", "numeric");
    expect(field()).toHaveAttribute("autocomplete", "one-time-code");
    await send("123456");

    expect(verifyTotpCodeAction).toHaveBeenCalledExactlyOnceWith({ factorId: FACTOR_ID, code: "123456" });
  });

  // implements FR-7 of pre-deploy-security-hardening: wrong code
  it.each([
    ["the action's wrong-code answer", { data: { ok: false, failure: "wrong-code" } } as const],
    ["a code the schema refuses", { validationErrors: { formErrors: [], fieldErrors: {} } }],
  ])("shows the wrong-code text under the field, keeping the digits and focus, for %s", async (_case, answer) => {
    vi.mocked(verifyTotpCodeAction).mockResolvedValue(answer);
    renderForm();

    await send("123456");

    expect(await screen.findByText(ADMIN_VERIFY_COPY.wrongCode)).toBeInTheDocument();
    expect(field()).toHaveValue("123456");
    expect(field()).toHaveAttribute("aria-invalid", "true");
    expect(field()).toHaveFocus();
  });

  // implements FR-7 of pre-deploy-security-hardening: the attempt limit
  it("shows the limit alert above the field and keeps the form", async () => {
    vi.mocked(verifyTotpCodeAction).mockResolvedValue({ data: { ok: false, failure: "limited" } });
    renderForm();

    await send("123456");

    expect(await screen.findByRole("alert")).toHaveTextContent(ADMIN_VERIFY_COPY.limited);
    expect(field()).toHaveValue("123456");
  });

  // implements FR-7, FR-8 of pre-deploy-security-hardening: unavailable
  it.each([
    ["the action's answer", () => vi.mocked(verifyTotpCodeAction).mockResolvedValue({ data: { ok: false, failure: "unavailable" } })],
    ["a masked server error", () => vi.mocked(verifyTotpCodeAction).mockResolvedValue({ serverError: "x" })],
    ["a dropped connection", () => vi.mocked(verifyTotpCodeAction).mockRejectedValue(new TypeError("fetch failed"))],
  ])("replaces the intro and the form with the unavailable alert for %s, and retry brings them back", async (_case, arrange) => {
    arrange();
    renderForm();

    const user = await send("123456");

    expect(await screen.findByRole("alert")).toHaveTextContent(SESSION_UNAVAILABLE_MESSAGE);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByText(INTRO)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Повторить" }));

    expect(field()).toBeInTheDocument();
    expect(screen.getByText(INTRO)).toBeInTheDocument();
  });

  it("disables the field and the button while there is no factor yet", () => {
    renderForm(null);

    expect(field()).toBeDisabled();
    expect(submitButton()).toBeDisabled();
  });

  it("disables both and marks the button busy while the code is checked", async () => {
    // React holds every later transition while an async one is pending, so this one is settled before the test ends.
    const answer = Promise.withResolvers<{ data: { ok: false; failure: "wrong-code" } }>();
    vi.mocked(verifyTotpCodeAction).mockReturnValue(answer.promise);
    renderForm();

    await send("123456");

    expect(field()).toBeDisabled();
    expect(submitButton()).toBeDisabled();
    expect(submitButton()).toHaveAttribute("aria-busy", "true");

    await act(async () => answer.resolve({ data: { ok: false, failure: "wrong-code" } }));
  });
});
