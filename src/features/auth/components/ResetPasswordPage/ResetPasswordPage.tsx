import { Suspense } from "react";

import { RESET_PASSWORD_PAGE_TITLE } from "../../model/auth-messages";
import { ResetPasswordContent } from "../ResetPasswordContent/ResetPasswordContent";

import type { ResetPasswordPageProps } from "./ResetPasswordPage.types";

/**
 * The `/reset-password` heading and its content inside their own `<Suspense>`: `status` and the session are
 * request-time data, awaited only inside the boundary (password-recovery design D4).
 */
export function ResetPasswordPage({ status }: ResetPasswordPageProps) {
  return (
    <>
      <h1 className="text-2xl font-semibold">{RESET_PASSWORD_PAGE_TITLE}</h1>
      <Suspense fallback={null}>
        <ResetPasswordContent status={status} />
      </Suspense>
    </>
  );
}
