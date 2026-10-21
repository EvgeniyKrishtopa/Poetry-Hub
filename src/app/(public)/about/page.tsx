import { CONTENT_PAGE_KEYS, ContentPage } from "@/features/content-page";

export default function AboutRoutePage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-start gap-8 px-6 py-16">
      <ContentPage entryKey={CONTENT_PAGE_KEYS.about} />
    </main>
  );
}
