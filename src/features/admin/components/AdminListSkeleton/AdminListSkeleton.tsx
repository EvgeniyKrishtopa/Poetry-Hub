import { ADMIN_LIST_COPY } from "../../model/admin-messages";

const SKELETON_ROWS = 4;
const SKELETON_KEYS = Array.from({ length: SKELETON_ROWS }, (_, index) => index);

/** Four placeholder rows (address, dates, three buttons) and a hidden «Загрузка…» (artboard 41, loading). */
export function AdminListSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col self-stretch border-b border-border">
      {SKELETON_KEYS.map((key) => (
        <div key={key} className="flex flex-col gap-2 border-t border-border py-4">
          <div className="h-6 w-65 max-w-full animate-pulse rounded-sm bg-surface motion-reduce:animate-none" />
          <div className="h-4 w-95 max-w-full animate-pulse rounded-sm bg-surface motion-reduce:animate-none" />
          <div className="flex flex-wrap gap-2">
            <div className="h-9 w-33 animate-pulse rounded-full bg-surface motion-reduce:animate-none" />
            <div className="h-9 w-37 animate-pulse rounded-full bg-surface motion-reduce:animate-none" />
            <div className="h-9 w-24 animate-pulse rounded-full bg-surface motion-reduce:animate-none" />
          </div>
        </div>
      ))}
      <span role="status" className="sr-only">
        {ADMIN_LIST_COPY.loading}
      </span>
    </div>
  );
}
