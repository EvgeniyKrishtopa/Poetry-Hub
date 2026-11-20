import { CONTENT_PAGE_KEYS, ContentPage, getContentPageMetadata } from "@/features/content-page";

export function generateMetadata() {
  return getContentPageMetadata(CONTENT_PAGE_KEYS.privacyPolicy);
}

export default function PrivacyRoutePage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-start gap-8 px-6 py-16">
      <ContentPage entryKey={CONTENT_PAGE_KEYS.privacyPolicy} />
    </main>
  );
}
