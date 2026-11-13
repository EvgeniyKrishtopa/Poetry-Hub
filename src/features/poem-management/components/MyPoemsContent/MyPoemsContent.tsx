import { requireSession } from "@/features/auth";
import { getOwnPublicAuthor } from "@/features/authors";
import { SESSION_STATE } from "@/shared/config/constants";
import { Alert, ButtonLink, SessionUnavailableAlert } from "@/shared/ui";

import { POEM_MANAGEMENT_COPY } from "../../model/poem-management-messages";
import { NEW_POEM_PATH } from "../../model/poem-paths";
import { NotPublicNotice } from "../NotPublicNotice/NotPublicNotice";

import type { MyPoemsContentProps } from "./MyPoemsContent.types";

/**
 * Session, own public author, then the buttons and the board slot, or a notice (design D4 table). The board reads and
 * arranges the author's collections and poems itself, and shows its own alert when a read fails, so the buttons stay
 * whatever happens to the lists (FR-11).
 */
export async function MyPoemsContent({ actions, board }: MyPoemsContentProps) {
  // Redirects a signed-out reader to /login before any read (FR-2).
  const session = await requireSession();
  if (session.state === SESSION_STATE.unknown) return <SessionUnavailableAlert />;

  const own = await getOwnPublicAuthor();
  if (!own.ok) return <Alert tone="danger">{POEM_MANAGEMENT_COPY.ownPoemsUnavailable}</Alert>;
  if (own.status === "not-public") return <NotPublicNotice />;

  return (
    <div className="flex flex-col items-start gap-8">
      <div className="flex flex-wrap gap-2">
        <ButtonLink href={NEW_POEM_PATH}>{POEM_MANAGEMENT_COPY.addLink}</ButtonLink>
        {actions}
      </div>
      {board}
    </div>
  );
}
