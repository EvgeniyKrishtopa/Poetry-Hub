import { GoogleSignInPanel, SignInPanel, getLoginPageMetadata } from "@/features/auth";

export const metadata = getLoginPageMetadata();

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  const error = searchParams.then((params) => params.error);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Вход</h1>
      <SignInPanel error={error} />
      <GoogleSignInPanel from="sign-in" error={error} />
    </main>
  );
}
