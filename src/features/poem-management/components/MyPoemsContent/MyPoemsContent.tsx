import { requireSession } from "@/features/auth";
import { getOwnPublicAuthor } from "@/features/authors";
import { listAuthorPoems, PoemTitleList } from "@/features/poems";
import { SESSION_STATE } from "@/shared/config/constants";
import { Alert, ButtonLink, SessionUnavailableAlert } from "@/shared/ui";

import { POEM_MANAGEMENT_COPY } from "../../model/poem-management-messages";
import { NEW_POEM_PATH, ownPoemPath } from "../../model/poem-paths";
import { NotPublicNotice } from "../NotPublicNotice/NotPublicNotice";

import type { MyPoemsContentProps } from "./MyPoemsContent.types";

/** Session, own public author, then the list, the empty state, or a notice (design D4 table). */
export async function MyPoemsContent({ actions, beforeList }: MyPoemsContentProps = {}) {
  // Redirects a signed-out reader to /login before any read (FR-2).
  const session = await requireSession();
  if (session.state === SESSION_STATE.unknown) return <SessionUnavailableAlert />;

  const own = await getOwnPublicAuthor();
  if (!own.ok) return <Alert tone="danger">{POEM_MANAGEMENT_COPY.ownPoemsUnavailable}</Alert>;
  if (own.status === "not-public") return <NotPublicNotice />;

  const list = await listAuthorPoems(own.authorId);

  return (
    <div className="flex flex-col items-start gap-8">
      <div className="flex flex-wrap gap-2">
        <ButtonLink href={NEW_POEM_PATH}>{POEM_MANAGEMENT_COPY.addLink}</ButtonLink>
        {actions}
      </div>
      {beforeList}
      {/* The add link stays when only the list failed (FR-11); no poems shows no list and no text (FR-2). */}
      {list.ok ? (
        list.poems.length > 0 && <PoemTitleList poems={list.poems} poemHref={ownPoemPath} />
      ) : (
        <Alert tone="danger" className="self-stretch">
          {POEM_MANAGEMENT_COPY.ownPoemsUnavailable}
        </Alert>
      )}
    </div>
  );
}
