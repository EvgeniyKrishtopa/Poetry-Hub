import { render, screen } from "@testing-library/react";
import { redirect } from "next/navigation";
import { Suspense, type ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SESSION_STATE } from "@/shared/config/constants";

import { getSessionState } from "../../dal/current-user";
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
vi.mock("../../dal/current-user", () => ({ getSessionState: vi.fn() }));
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

function signedIn(restriction: RestrictionCheck): void {
  vi.mocked(getSessionState).mockResolvedValue({ state: SESSION_STATE.signedIn, userId: "user-1" } as never);
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
  it("shows the form to a signed-in, unrestricted session", async () => {
    signedIn("allowed");

    await renderContent();

    expect(screen.getByLabelText("Новый пароль")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: NEW_PASSWORD_SUBMIT_LABEL })).toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });

  // implements FR-4 of password-recovery
  it("redirects a signed-out request to the dead-link notice", async () => {
    redirectThrows();
    vi.mocked(getSessionState).mockResolvedValue({ state: SESSION_STATE.signedOut });

    await expect(renderContent()).rejects.toThrow(REDIRECT_SENTINEL);

    expect(redirect).toHaveBeenCalledExactlyOnceWith(RECOVERY_FAILED_TARGET);
    expect(checkRestriction).not.toHaveBeenCalled();
  });

  // implements FR-4, FR-10 of password-recovery
  it.each<RestrictionCheck>(["restricted", "unauthenticated"])(
    "redirects a session whose restriction check says %s exactly like a signed-out request",
    async (restriction) => {
      redirectThrows();
      signedIn(restriction);

      await expect(renderContent()).rejects.toThrow(REDIRECT_SENTINEL);

      expect(redirect).toHaveBeenCalledExactlyOnceWith(RECOVERY_FAILED_TARGET);
    },
  );

  // implements FR-4, FR-10 of password-recovery
  it("shows the unavailable alert and no form when the restriction check cannot tell", async () => {
    signedIn("unknown");

    await renderContent();

    expect(screen.getByRole("alert")).toHaveTextContent(UNAVAILABLE_MESSAGE);
    expect(screen.queryByLabelText("Новый пароль")).not.toBeInTheDocument();
    expect(screen.queryByText(/заблокирован/i)).not.toBeInTheDocument();
  });

  // implements FR-4 of password-recovery
  it("shows the unavailable alert and no form when the session check cannot tell", async () => {
    vi.mocked(getSessionState).mockResolvedValue({ state: SESSION_STATE.unknown });

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
    expect(getSessionState).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  // implements FR-4 of password-recovery
  it.each([["something-else"], [["updated", "updated"]]])("treats the status %j as no status", async (status) => {
    redirectThrows();
    vi.mocked(getSessionState).mockResolvedValue({ state: SESSION_STATE.signedOut });

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
