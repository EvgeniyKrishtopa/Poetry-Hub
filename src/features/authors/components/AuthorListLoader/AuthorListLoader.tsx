import { listPublicAuthors } from "../../dal/public-authors";
import { AuthorList } from "../AuthorList/AuthorList";

/** Awaits the cached directory read inside `AuthorDirectory`'s Suspense boundary. */
export async function AuthorListLoader() {
  return <AuthorList result={await listPublicAuthors()} />;
}
