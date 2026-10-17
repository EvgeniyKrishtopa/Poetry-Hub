import { SignInPanel } from "@/features/auth";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Вход</h1>
      <SignInPanel error={searchParams.then((params) => params.error)} />
    </main>
  );
}
