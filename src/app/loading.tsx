// Neutral on purpose: this is the fallback for every segment under the root, not just the home page.
const SKELETON_TEXT_LINE_WIDTHS = ["w-full", "w-11/12", "w-3/4"] as const;

const SKELETON_BLOCK = "rounded bg-surface animate-pulse motion-reduce:animate-none";

// implements NFR-1, NFR-3 of add-route-states: design-token utilities only; stays a Server Component.
export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-6 py-16">
      <div role="status">
        <span className="sr-only">Loading…</span>
      </div>
      <div aria-hidden="true" data-skeleton className={`${SKELETON_BLOCK} h-10 w-1/2`} />
      {SKELETON_TEXT_LINE_WIDTHS.map((width) => (
        <div key={width} aria-hidden="true" data-skeleton className={`${SKELETON_BLOCK} h-4 ${width}`} />
      ))}
    </main>
  );
}
