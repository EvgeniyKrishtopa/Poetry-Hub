import { AdminPage } from "@/features/admin";

export default function AdminRoutePage({ searchParams }: PageProps<"/admin">) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-start gap-8 px-6 py-16">
      <AdminPage query={searchParams} />
    </main>
  );
}
