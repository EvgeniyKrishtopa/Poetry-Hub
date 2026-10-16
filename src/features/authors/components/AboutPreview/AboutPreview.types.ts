import type { AboutAlign } from "../../model/author.types";

export interface AboutPreviewProps {
  readonly markdown: string;
  readonly align: AboutAlign;
  readonly onAlignChange: (align: AboutAlign) => void;
}
