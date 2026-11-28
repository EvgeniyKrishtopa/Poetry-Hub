"use client";

import Image from "next/image";
import { startTransition, useActionState } from "react";

import { Button, SessionUnavailableAlert } from "@/shared/ui";

import { ADMIN_VERIFY_COPY } from "../../model/admin-messages";
import { groupTotpSecret } from "../../model/group-totp-secret";
import type { TotpEnrolmentResult } from "../../model/totp.types";
import { TotpCodeForm } from "../TotpCodeForm/TotpCodeForm";

import { startEnrolment } from "./start-enrolment";
import styles from "./TotpEnrolment.module.css";

/** The QR image's side in px; the white frame around it adds the quiet zone a scanner needs. */
const QR_SIZE = 168;

type EnrolmentRequest = "start" | "reset";

/** Enrolment of the second factor: start, then the QR code, the secret and the code form. */
export function TotpEnrolment() {
  const [enrolment, request, pending] = useActionState(
    async (_previous: TotpEnrolmentResult | null, kind: EnrolmentRequest): Promise<TotpEnrolmentResult | null> => {
      if (kind === "reset") return null;
      return startEnrolment();
    },
    null,
  );
  const send = (kind: EnrolmentRequest) => startTransition(() => request(kind));

  if (enrolment?.ok === false) return <SessionUnavailableAlert onRetry={() => send("reset")} />;

  if (enrolment === null && !pending) {
    return (
      <>
        <p>{ADMIN_VERIFY_COPY.enrolIntro}</p>
        <Button onClick={() => send("start")}>{ADMIN_VERIFY_COPY.startButton}</Button>
      </>
    );
  }

  const secretLabel = <span className="text-sm font-medium">{ADMIN_VERIFY_COPY.secretLabel}</span>;

  return (
    <div aria-busy={pending} className="flex flex-col items-start gap-4 self-stretch">
      <TotpCodeForm factorId={enrolment?.factorId ?? null} onRetry={() => send("reset")}>
        {enrolment ? (
          <>
            <p>{ADMIN_VERIFY_COPY.scanIntro}</p>
            <div className={styles.qr}>
              <Image src={enrolment.qrCode} alt={ADMIN_VERIFY_COPY.qrAlt} width={QR_SIZE} height={QR_SIZE} unoptimized />
            </div>
            <div className="flex flex-col gap-1.5 self-stretch">
              {secretLabel}
              <code className="rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm tracking-wider wrap-anywhere">
                {groupTotpSecret(enrolment.secret)}
              </code>
            </div>
          </>
        ) : (
          <>
            <p role="status">{ADMIN_VERIFY_COPY.loading}</p>
            <div className="size-46 animate-pulse rounded-md bg-surface motion-reduce:animate-none" />
            <div className="flex flex-col gap-1.5 self-stretch">
              {secretLabel}
              <div className="h-9.5 animate-pulse rounded-sm bg-surface motion-reduce:animate-none" />
            </div>
          </>
        )}
      </TotpCodeForm>
    </div>
  );
}
