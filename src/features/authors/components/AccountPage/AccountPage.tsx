import { Suspense } from "react";

import { CONTENT_LANG } from "@/shared/config/constants";

import { PAGE_TITLES } from "../../model/author-messages";
import { AccountAuthorSection } from "../AccountAuthorSection/AccountAuthorSection";
import { AccountAuthorSectionSkeleton } from "../AccountAuthorSectionSkeleton/AccountAuthorSectionSkeleton";

/**
 * The account page: its heading in the static shell, then the author section, which reads the session
 * and the own profile per request inside this Suspense boundary (FR-1).
 */
export function AccountPage() {
  return (
    <div lang={CONTENT_LANG} className="flex flex-col gap-8">
      <h1 className="text-4xl font-bold tracking-tight">{PAGE_TITLES.account}</h1>
      <Suspense fallback={<AccountAuthorSectionSkeleton />}>
        <AccountAuthorSection />
      </Suspense>
    </div>
  );
}
