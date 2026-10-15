import type { AboutAlign } from "../../model/author.types";

export interface AuthorAboutProps {
  readonly markdown: string;
  readonly align: AboutAlign;
}
