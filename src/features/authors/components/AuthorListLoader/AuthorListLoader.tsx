import { listPublicAuthors } from "../../dal/public-authors";
import { AuthorList } from "../AuthorList/AuthorList";

/** Awaits the cached directory read inside `AuthorDirectory`'s Suspense boundary. */
export async function AuthorListLoader() {
  const result = await listPublicAuthors();
  return <AuthorList result={result} />;
}
