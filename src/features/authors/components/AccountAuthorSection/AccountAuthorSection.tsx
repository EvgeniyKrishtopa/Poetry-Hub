import { Suspense } from "react";

import { RUSSIAN_LANG } from "@/shared/config/constants";

import { PAGE_TITLES } from "../../model/author-messages";
import { AccountAuthorLoader } from "../AccountAuthorLoader/AccountAuthorLoader";

const SKELETON_BLOCK = "bg-surface animate-pulse motion-reduce:animate-none";

/**
 * The account page: its heading in the static shell, then the author section, which reads the session
 * and the own profile per request inside this Suspense boundary (FR-1). The fallback stands in for the
 * section heading (180 × 28) and the link pill (232 × 36).
 */
export function AccountAuthorSection() {
  return (
    <div lang={RUSSIAN_LANG} className="flex flex-col gap-8">
      <h1 className="text-4xl font-bold tracking-tight">{PAGE_TITLES.account}</h1>
      <Suspense
        fallback={
          <div aria-hidden="true" className="flex flex-col gap-4">
            <div data-skeleton className={`${SKELETON_BLOCK} h-7 w-45 rounded`} />
            <div data-skeleton className={`${SKELETON_BLOCK} h-9 w-58 rounded-full`} />
          </div>
        }
      >
        <AccountAuthorLoader />
      </Suspense>
    </div>
  );
}
