import { GoogleSignInPanel, SignUpForm, getSignupPageMetadata } from "@/features/auth";

export const metadata = getSignupPageMetadata();

export default function SignUpPage({ searchParams }: PageProps<"/signup">) {
  const error = searchParams.then((params) => params.error);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Регистрация</h1>
      <SignUpForm />
      <GoogleSignInPanel from="sign-up" error={error} />
    </main>
  );
}
