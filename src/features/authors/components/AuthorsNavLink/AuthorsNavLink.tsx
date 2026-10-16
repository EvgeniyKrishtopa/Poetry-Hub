import Link from "next/link";

import { RUSSIAN_LANG } from "@/shared/config/constants";

import { AUTHORS_PATH } from "../../model/author.constants";
import { PAGE_TITLES } from "../../model/author-messages";

/** The header's «Наши авторы» link, shown to every visitor (FR-3). */
export function AuthorsNavLink() {
  return (
    <Link lang={RUSSIAN_LANG} href={AUTHORS_PATH} className="text-sm font-medium text-foreground hover:text-accent">
      {PAGE_TITLES.authors}
    </Link>
  );
}
