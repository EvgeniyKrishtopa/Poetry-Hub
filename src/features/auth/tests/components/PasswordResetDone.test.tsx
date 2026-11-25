import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PasswordResetDone } from "../../components/PasswordResetDone/PasswordResetDone";
import {
  BACK_TO_SIGN_IN_LABEL,
  PASSWORD_RESET_DONE_MESSAGE,
  PASSWORD_RESET_SIGN_OUT_FAILED_MESSAGE,
} from "../../model/auth-messages";
import { RESET_STATUS } from "../../model/auth.constants";

describe("PasswordResetDone", () => {
  // implements FR-6, NFR-2 of password-recovery
  it.each([
    [RESET_STATUS.updated, PASSWORD_RESET_DONE_MESSAGE, "success"],
    [RESET_STATUS.updatedSignOutFailed, PASSWORD_RESET_SIGN_OUT_FAILED_MESSAGE, "neutral"],
  ] as const)("shows the %s notice with the link to sign-in, and the notice takes focus", (status, message, tone) => {
    render(<PasswordResetDone status={status} />);

    const notice = screen.getByRole("status");
    expect(notice).toHaveTextContent(message);
    expect(notice).toHaveClass(tone === "success" ? "border-success" : "border-muted");
    expect(notice.parentElement).toHaveFocus();
    expect(screen.getByRole("link", { name: BACK_TO_SIGN_IN_LABEL })).toHaveAttribute("href", "/login");
  });

  // implements FR-6 of password-recovery
  it("tells the truth about the old sessions only when the sign-out failed", () => {
    render(<PasswordResetDone status={RESET_STATUS.updated} />);

    expect(screen.queryByText(/завершить прежние сессии не удалось/)).not.toBeInTheDocument();
  });
});
