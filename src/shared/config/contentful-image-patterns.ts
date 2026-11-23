/** Contentful's public image host: every published image asset is served from here. */
export const CONTENTFUL_IMAGE_HOST = "images.ctfassets.net";

// The same format the Contentful client's config accepts for CONTENTFUL_SPACE_ID. It is repeated here because
// `next.config.ts` loads this file, so it cannot import the client's `server-only` module.
const SPACE_ID_FORMAT = /^[a-z0-9]+$/;

const IMAGE_PROTOCOL = "https:";

function isSpaceId(spaceId: string | undefined): spaceId is string {
  return spaceId !== undefined && SPACE_ID_FORMAT.test(spaceId);
}

/**
 * `images.remotePatterns` for the project's Contentful images: the image host, under the project's own space id.
 * An unset, empty or malformed space id gives an empty list, so a build without it (CI) still succeeds.
 */
export function buildContentfulImagePatterns(spaceId: string | undefined): URL[] {
  if (!isSpaceId(spaceId)) return [];
  return [new URL(`/${spaceId}/**`, `${IMAGE_PROTOCOL}//${CONTENTFUL_IMAGE_HOST}`)];
}

/**
 * Whether `next/image` may load `url`: the same rule `remotePatterns` applies (https, the image host, no port,
 * the space's path prefix, no query string). The banner's schema calls it so that an address the optimizer
 * would refuse never reaches the page.
 */
export function isAllowedContentfulImageUrl(url: string, spaceId: string | undefined): boolean {
  if (!isSpaceId(spaceId) || !URL.canParse(url)) return false;
  const parsed = new URL(url);
  return (
    parsed.protocol === IMAGE_PROTOCOL &&
    parsed.host === CONTENTFUL_IMAGE_HOST &&
    parsed.search === "" &&
    parsed.pathname.startsWith(`/${spaceId}/`)
  );
}
