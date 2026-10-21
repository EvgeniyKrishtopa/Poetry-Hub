import "server-only";

import type { AboutPageResult } from "../model/about-page.types";

/** Reads the `about_page` entry in its own cache scope, tagged for the publish webhook (design D2). */
export async function getAboutPage(): Promise<AboutPageResult> {
  throw new Error("not implemented");
}
