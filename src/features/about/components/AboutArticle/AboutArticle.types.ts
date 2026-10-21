import type { AboutPageEntry } from "../../model/about-page.schema";

export interface AboutArticleProps {
  entry: Pick<AboutPageEntry, "title" | "message">;
}
