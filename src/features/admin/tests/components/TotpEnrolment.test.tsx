import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SESSION_UNAVAILABLE_MESSAGE } from "@/shared/ui/ui-messages";

import { startTotpEnrolmentAction } from "../../actions/start-totp-enrolment.actions";
import { TotpEnrolment } from "../../components/TotpEnrolment/TotpEnrolment";
import { ADMIN_VERIFY_COPY } from "../../model/admin-messages";

vi.mock("../../actions/start-totp-enrolment.actions", () => ({ startTotpEnrolmentAction: vi.fn() }));
vi.mock("../../actions/verify-totp-code.actions", () => ({ verifyTotpCodeAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const ENROLMENT = {
  ok: true,
  factorId: "5b1f0a52-3a39-4d0e-9f0c-2f0a3b6c9d11",
  qrCode: "data:image/svg+xml;utf-8,<svg/>",
  secret: "JBSWY3DPEHPK3PXP",
} as const;

afterEach(() => vi.clearAllMocks());

async function start() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: ADMIN_VERIFY_COPY.startButton }));
  return user;
}

describe("TotpEnrolment", () => {
  // implements FR-7 of pre-deploy-security-hardening: enrolment starts only by an explicit action
  it("starts nothing until the button is pressed", () => {
    render(<TotpEnrolment />);

    expect(screen.getByText(ADMIN_VERIFY_COPY.enrolIntro)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(startTotpEnrolmentAction).not.toHaveBeenCalled();
  });

  it("shows the loading state with the field disabled while the QR code is fetched", async () => {
    // React holds every later transition while an async one is pending, so this one is settled before the test ends.
    const answer = Promise.withResolvers<{ data: typeof ENROLMENT }>();
    vi.mocked(startTotpEnrolmentAction).mockReturnValue(answer.promise);
    render(<TotpEnrolment />);

    await start();

    expect(screen.getByRole("status")).toHaveTextContent(ADMIN_VERIFY_COPY.loading);
    expect(screen.getByRole("textbox", { name: ADMIN_VERIFY_COPY.codeLabel })).toBeDisabled();
    expect(screen.getByRole("button", { name: ADMIN_VERIFY_COPY.submitButton })).toBeDisabled();

    await act(async () => answer.resolve({ data: ENROLMENT }));
  });

  // implements FR-7, NFR-6 of pre-deploy-security-hardening
  it("shows the QR code, the grouped secret and the code field", async () => {
    vi.mocked(startTotpEnrolmentAction).mockResolvedValue({ data: ENROLMENT });
    render(<TotpEnrolment />);

    await start();

    expect(await screen.findByRole("img", { name: ADMIN_VERIFY_COPY.qrAlt })).toHaveAttribute("src", ENROLMENT.qrCode);
    expect(screen.getByText("JBSW Y3DP EHPK 3PXP")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: ADMIN_VERIFY_COPY.codeLabel })).toBeEnabled();
  });

  it.each([
    ["a failed start", () => vi.mocked(startTotpEnrolmentAction).mockResolvedValue({ data: { ok: false, failure: "unavailable" } })],
    ["a dropped connection", () => vi.mocked(startTotpEnrolmentAction).mockRejectedValue(new TypeError("fetch failed"))],
  ])("shows the unavailable alert and no form for %s, and retry goes back to the start", async (_case, arrange) => {
    arrange();
    render(<TotpEnrolment />);

    const user = await start();

    expect(await screen.findByRole("alert")).toHaveTextContent(SESSION_UNAVAILABLE_MESSAGE);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Повторить" }));

    expect(await screen.findByRole("button", { name: ADMIN_VERIFY_COPY.startButton })).toBeInTheDocument();
  });
});
