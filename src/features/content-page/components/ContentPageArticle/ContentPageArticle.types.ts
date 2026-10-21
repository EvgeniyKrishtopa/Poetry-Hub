import type { ContentPageEntry } from "../../model/content-page.schema";

export interface ContentPageArticleProps {
  entry: Pick<ContentPageEntry, "title" | "message">;
}
