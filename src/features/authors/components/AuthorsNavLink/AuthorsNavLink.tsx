import Link from "next/link";

import { RUSSIAN_LANG } from "@/shared/config/constants";

import { PAGE_TITLES } from "../../model/author-messages";

const DIRECTORY_PATH = "/authors";

/** The header's «Наши авторы» link, shown to every visitor (FR-3). */
export function AuthorsNavLink() {
  return (
    <Link lang={RUSSIAN_LANG} href={DIRECTORY_PATH} className="text-sm font-medium text-foreground hover:text-accent">
      {PAGE_TITLES.authors}
    </Link>
  );
}
