import Link from "next/link";

// implements NFR-1, NFR-3 of add-route-states: design-token utilities only; stays a Server Component.
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">Страница не найдена</h1>
      <p className="text-muted">Такой страницы нет или она переехала.</p>
      <Link href="/" className="self-start font-medium text-accent underline-offset-4 hover:underline">
        На главную
      </Link>
    </main>
  );
}
