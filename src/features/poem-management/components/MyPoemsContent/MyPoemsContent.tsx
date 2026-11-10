import { requireSession } from "@/features/auth";
import { getOwnPublicAuthor } from "@/features/authors";
import { listAuthorPoems, type Poem, PoemTitleList } from "@/features/poems";
import { SESSION_STATE } from "@/shared/config/constants";
import { Alert, ButtonLink, SessionUnavailableAlert } from "@/shared/ui";

import { selectFreePoems } from "../../model/free-poems";
import { POEM_MANAGEMENT_COPY } from "../../model/poem-management-messages";
import { NEW_POEM_PATH, ownPoemPath } from "../../model/poem-paths";
import { NotPublicNotice } from "../NotPublicNotice/NotPublicNotice";

import type { MyPoemsContentProps } from "./MyPoemsContent.types";

/** The free poems as title links; none shows no list and no text (FR-2). */
function renderFreePoems(poems: readonly Poem[]) {
  return poems.length > 0 && <PoemTitleList poems={poems} poemHref={ownPoemPath} />;
}

/**
 * Session, own public author, then the free-poem list, the empty state, or a notice (design D4 table). The poem list and
 * which poems are collected are read in parallel; either failing shows the list alert, never a guessed list
 * (show-only-free-poems D3).
 */
export async function MyPoemsContent({ actions, beforeList, readCollectedPoems }: MyPoemsContentProps) {
  // Redirects a signed-out reader to /login before any read (FR-2).
  const session = await requireSession();
  if (session.state === SESSION_STATE.unknown) return <SessionUnavailableAlert />;

  const own = await getOwnPublicAuthor();
  if (!own.ok) return <Alert tone="danger">{POEM_MANAGEMENT_COPY.ownPoemsUnavailable}</Alert>;
  if (own.status === "not-public") return <NotPublicNotice />;

  const [list, collected] = await Promise.all([listAuthorPoems(own.authorId), readCollectedPoems()]);

  return (
    <div className="flex flex-col items-start gap-8">
      <div className="flex flex-wrap gap-2">
        <ButtonLink href={NEW_POEM_PATH}>{POEM_MANAGEMENT_COPY.addLink}</ButtonLink>
        {actions}
      </div>
      {beforeList}
      {/* The buttons stay when only the list failed (FR-11); either read failing never shows a guessed list. */}
      {list.ok && collected.ok ? (
        renderFreePoems(selectFreePoems(list.poems, collected.poems))
      ) : (
        <Alert tone="danger" className="self-stretch">
          {POEM_MANAGEMENT_COPY.ownPoemsUnavailable}
        </Alert>
      )}
    </div>
  );
}
