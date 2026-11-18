import { getSessionState } from "@/features/auth";
import { SESSION_STATE } from "@/shared/config/constants";

import { checkMayModerateAuthor } from "../../dal/admin-check";
import { AddToViolationsButton } from "../AddToViolationsButton/AddToViolationsButton";

import type { AddToViolationsControlProps } from "./AddToViolationsControl.types";

/**
 * The session is read first and the database is asked only of a signed-in reader, so a guest costs no RPC (NFR-4).
 * An unreadable session or answer shows nothing: the control is never offered on a guess. `checkMayModerateAuthor`
 * is cached per request, so this control and the delete control next to it share one answer.
 */
export async function AddToViolationsControlContent({ authorId, authorName, content }: AddToViolationsControlProps) {
  const { state } = await getSessionState();
  if (state !== SESSION_STATE.signedIn) return null;

  const check = await checkMayModerateAuthor(authorId);
  if (!check.ok || !check.mayModerate) return null;

  return <AddToViolationsButton authorProfileId={authorId} authorName={authorName} content={content} />;
}
