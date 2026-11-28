import { render, screen } from "@testing-library/react";
import { redirect } from "next/navigation";
import { Suspense, type ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { checkRecoverySession } from "../../dal/recovery-check";
import { checkRestriction } from "../../dal/restriction-check";
import { ResetPasswordContent } from "../../components/ResetPasswordContent/ResetPasswordContent";
import { ResetPasswordPage } from "../../components/ResetPasswordPage/ResetPasswordPage";
import {
  BACK_TO_SIGN_IN_LABEL,
  NEW_PASSWORD_SUBMIT_LABEL,
  PASSWORD_RESET_DONE_MESSAGE,
  PASSWORD_RESET_SIGN_OUT_FAILED_MESSAGE,
} from "../../model/auth-messages";
import { RESET_STATUS } from "../../model/auth.constants";
import type { RestrictionCheck } from "../../model/auth.types";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("../../actions/auth.actions", () => ({ updatePasswordAction: vi.fn() }));
vi.mock("../../dal/recovery-check", () => ({ checkRecoverySession: vi.fn() }));
vi.mock("../../dal/restriction-check", () => ({ checkRestriction: vi.fn() }));

const RECOVERY_FAILED_TARGET = "/login?error=recovery-failed";
const UNAVAILABLE_MESSAGE = "Восстановление пароля сейчас недоступно.";
const REDIRECT_SENTINEL = "NEXT_REDIRECT";

// Like the real `redirect`, which throws, so nothing after it runs.
function redirectThrows(): void {
  vi.mocked(redirect).mockImplementation(() => {
    throw new Error(REDIRECT_SENTINEL);
  });
}

function recoverySession(restriction: RestrictionCheck): void {
  vi.mocked(checkRecoverySession).mockResolvedValue("recovery");
  vi.mocked(checkRestriction).mockResolvedValue(restriction);
}

async function renderContent(status?: string | string[]): Promise<void> {
  render(await ResetPasswordContent({ status: Promise.resolve(status) }));
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("ResetPasswordContent", () => {
  // implements FR-4 of password-recovery
  it("shows the form to a recovery, unrestricted session", async () => {
    recoverySession("allowed");

    await renderContent();

    expect(screen.getByLabelText("Новый пароль")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: NEW_PASSWORD_SUBMIT_LABEL })).toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });

  // implements FR-4 of password-recovery and FR-3 of pre-deploy-security-hardening
  it("redirects anything but a recent recovery session, signed out included, to the dead-link notice", async () => {
    redirectThrows();
    vi.mocked(checkRecoverySession).mockResolvedValue("not-recovery");

    await expect(renderContent()).rejects.toThrow(REDIRECT_SENTINEL);

    expect(redirect).toHaveBeenCalledExactlyOnceWith(RECOVERY_FAILED_TARGET);
    expect(checkRestriction).not.toHaveBeenCalled();
  });

  // implements FR-4, FR-10 of password-recovery
  it.each<RestrictionCheck>(["restricted", "unauthenticated"])(
    "redirects a session whose restriction check says %s exactly like a signed-out request",
    async (restriction) => {
      redirectThrows();
      recoverySession(restriction);

      await expect(renderContent()).rejects.toThrow(REDIRECT_SENTINEL);

      expect(redirect).toHaveBeenCalledExactlyOnceWith(RECOVERY_FAILED_TARGET);
    },
  );

  // implements FR-4, FR-10 of password-recovery
  it("shows the unavailable alert and no form when the restriction check cannot tell", async () => {
    recoverySession("unknown");

    await renderContent();

    expect(screen.getByRole("alert")).toHaveTextContent(UNAVAILABLE_MESSAGE);
    expect(screen.queryByLabelText("Новый пароль")).not.toBeInTheDocument();
    expect(screen.queryByText(/заблокирован/i)).not.toBeInTheDocument();
  });

  // implements FR-4 of password-recovery
  it("shows the unavailable alert and no form when the recovery check cannot tell", async () => {
    vi.mocked(checkRecoverySession).mockResolvedValue("unknown");

    await renderContent();

    expect(screen.getByRole("alert")).toHaveTextContent(UNAVAILABLE_MESSAGE);
    expect(screen.queryByLabelText("Новый пароль")).not.toBeInTheDocument();
    expect(checkRestriction).not.toHaveBeenCalled();
  });

  // implements FR-4, FR-6 of password-recovery
  it.each([
    [RESET_STATUS.updated, PASSWORD_RESET_DONE_MESSAGE],
    [RESET_STATUS.updatedSignOutFailed, PASSWORD_RESET_SIGN_OUT_FAILED_MESSAGE],
  ] as const)("shows the %s done notice with no session read and no redirect", async (status, message) => {
    await renderContent(status);

    expect(screen.getByRole("status")).toHaveTextContent(message);
    expect(screen.getByRole("link", { name: BACK_TO_SIGN_IN_LABEL })).toHaveAttribute("href", "/login");
    expect(checkRecoverySession).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  // implements FR-4 of password-recovery
  it.each([["something-else"], [["updated", "updated"]]])("treats the status %j as no status", async (status) => {
    redirectThrows();
    vi.mocked(checkRecoverySession).mockResolvedValue("not-recovery");

    await expect(renderContent(status)).rejects.toThrow(REDIRECT_SENTINEL);
  });
});

describe("ResetPasswordPage", () => {
  // implements FR-4, NFR-4 of password-recovery
  it("renders the heading and wraps the request-time content in its own Suspense", () => {
    const status = Promise.resolve(undefined);
    const page = ResetPasswordPage({ status }) as ReactElement<{ children: [ReactElement, ReactElement] }>;
    const [heading, boundary] = page.props.children;

    render(heading);
    expect(screen.getByRole("heading", { level: 1, name: "Новый пароль" })).toBeInTheDocument();
    expect(boundary.type).toBe(Suspense);
    const { children } = boundary.props as { children: ReactElement<{ status: Promise<unknown> }> };
    expect(children.type).toBe(ResetPasswordContent);
    expect(children.props.status).toBe(status);
  });
});
