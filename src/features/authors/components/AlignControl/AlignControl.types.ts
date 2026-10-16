import type { AboutAlign } from "../../model/author.types";

export interface AlignControlProps {
  readonly value: AboutAlign;
  readonly onChange: (align: AboutAlign) => void;
}
