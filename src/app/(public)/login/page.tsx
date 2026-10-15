import { Suspense } from "react";

import { SignInForm, SignInFormWithError } from "@/features/auth";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      {/* `searchParams` is request-time data under Cache Components, so it is read only inside the
          Suspense boundary. The fallback is the same form without the alert, so the static shell
          already holds a usable form. */}
      <Suspense fallback={<SignInForm />}>
        <SignInFormWithError searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
