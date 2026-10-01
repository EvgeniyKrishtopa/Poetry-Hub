import Link from "next/link";

// implements FR-1 of add-route-states: rendered with HTTP 404 for unmatched URLs and notFound() calls.
// implements NFR-1 of add-route-states: design-token utilities only.
// implements NFR-3 of add-route-states: stays a Server Component.
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">Page not found</h1>
      <p className="text-muted">The page you are looking for doesn&apos;t exist or has moved.</p>
      <Link href="/" className="self-start font-medium text-accent underline-offset-4 hover:underline">
        Back to the home page
      </Link>
    </main>
  );
}
