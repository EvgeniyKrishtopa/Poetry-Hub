const SKELETON_BLOCK = "bg-surface animate-pulse motion-reduce:animate-none";

/** `AccountAuthorSection` while it loads: the section heading (180 × 28) and the link pill (232 × 36). */
export function AccountAuthorSectionSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      <div data-skeleton className={`${SKELETON_BLOCK} h-7 w-45 rounded`} />
      <div data-skeleton className={`${SKELETON_BLOCK} h-9 w-58 rounded-full`} />
    </div>
  );
}
