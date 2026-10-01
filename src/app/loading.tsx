// Neutral on purpose: this is the fallback for every segment under the root, not just the home page.
const SKELETON_TEXT_LINE_WIDTHS = ["w-full", "w-11/12", "w-3/4"] as const;

const SKELETON_BLOCK = "rounded bg-surface animate-pulse motion-reduce:animate-none";

// implements FR-6 of add-route-states: status region announced to assistive tech; skeleton hidden from it.
// implements NFR-1 of add-route-states: design-token utilities only.
// implements NFR-2 of add-route-states: pulse disabled under prefers-reduced-motion.
// implements NFR-3 of add-route-states: stays a Server Component.
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
