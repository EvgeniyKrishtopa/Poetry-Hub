import { getResetPasswordPageMetadata, RESET_STATUS_PARAM, ResetPasswordPage } from "@/features/auth";

export const metadata = getResetPasswordPageMetadata();

export default function ResetPasswordRoute({ searchParams }: PageProps<"/reset-password">) {
  const status = searchParams.then((params) => params[RESET_STATUS_PARAM]);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-6 py-16">
      <ResetPasswordPage status={status} />
    </main>
  );
}
