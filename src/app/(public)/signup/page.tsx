import { SignUpForm } from "@/features/auth";

// implements FR-3 of add-supabase-auth
export default function SignUpPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Create account</h1>
      <SignUpForm />
    </main>
  );
}
