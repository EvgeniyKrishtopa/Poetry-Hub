const SKELETON_BLOCK = "bg-surface animate-pulse motion-reduce:animate-none rounded";

const ROW_CLASS = "grid gap-y-3 border-t border-border py-6 min-[600px]:grid-cols-[10rem_minmax(0,1fr)] min-[600px]:gap-x-6";

/** `AuthorEditorLoader` while it loads: four field rows of label and value skeletons (the mockup's loading state). */
export function AuthorEditorSkeleton() {
  return (
    <div aria-hidden="true" className="mt-6 flex flex-col">
      <div className={ROW_CLASS}>
        <div data-skeleton className={`${SKELETON_BLOCK} mt-2 h-5 w-16`} />
        <div data-skeleton className={`${SKELETON_BLOCK} h-9 w-60`} />
      </div>
      <div className={ROW_CLASS}>
        <div data-skeleton className={`${SKELETON_BLOCK} mt-2 h-5 w-22`} />
        <div data-skeleton className={`${SKELETON_BLOCK} h-9 w-60`} />
      </div>
      <div className={ROW_CLASS}>
        <div data-skeleton className={`${SKELETON_BLOCK} mt-2 h-5 w-18`} />
        <div data-skeleton className={`${SKELETON_BLOCK} h-24 w-full`} />
      </div>
      <div className={ROW_CLASS}>
        <div data-skeleton className={`${SKELETON_BLOCK} mt-2 h-5 w-14`} />
        <div data-skeleton className={`${SKELETON_BLOCK} h-9 w-40`} />
      </div>
    </div>
  );
}
