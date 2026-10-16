import { requireUserId } from "@/features/auth";

import { getMyAuthorProfile } from "../../dal/my-author-profile";
import { ACCOUNT_AUTHOR_SECTION_TITLE } from "../../model/author-messages";
import { AccountAuthorLinks } from "../AccountAuthorLinks/AccountAuthorLinks";

/** Session gate, then the owner read, inside `AccountAuthorSection`'s Suspense boundary (FR-1, FR-18). */
export async function AccountAuthorLoader() {
  // Redirects a signed-out visitor to /login before any profile read (NFR-2).
  await requireUserId();
  const result = await getMyAuthorProfile();

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{ACCOUNT_AUTHOR_SECTION_TITLE}</h2>
      <AccountAuthorLinks result={result} />
    </section>
  );
}
