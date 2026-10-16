import { requireUserId } from "@/features/auth";

import { getMyAuthorProfile } from "../../dal/my-author-profile";
import { ACCOUNT_AUTHOR_SECTION_TITLE } from "../../model/author-messages";
import { AccountAuthorLinks } from "../AccountAuthorLinks/AccountAuthorLinks";

/** The «Профиль автора» section: session gate, then the owner read, inside `AccountPage`'s Suspense boundary (FR-1, FR-18). */
export async function AccountAuthorSection() {
  // Redirects a signed-out visitor to /login before any profile read (NFR-2). Without it, a guest's
  // read would come back as "no profile" and the page would offer «Создать кабинет автора».
  await requireUserId();
  const result = await getMyAuthorProfile();

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{ACCOUNT_AUTHOR_SECTION_TITLE}</h2>
      <AccountAuthorLinks result={result} />
    </section>
  );
}
