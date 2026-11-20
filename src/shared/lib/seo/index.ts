import "server-only";

export { FALLBACK_METADATA, buildNoIndexMetadata, buildPageMetadata, toCanonicalPath } from "./page-metadata";
export { toPlainTextExcerpt } from "./plain-text-excerpt";
export {
  API_PATH,
  AUTH_PATH,
  DEFAULT_SHARE_IMAGE_PATH,
  DESCRIPTION_MAX_LENGTH,
  OG_LOCALE,
  TITLE_TEMPLATE,
} from "./seo.constants";
export type { NoIndexMetadataInput, PageMetadataInput, PageType } from "./seo.types";
export { getSiteUrl } from "./site-url";
