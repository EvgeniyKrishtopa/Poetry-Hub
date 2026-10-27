/** The URL segment under an author page that holds the author's poems: `/authors/<id>/poems`. */
export const POEMS_SEGMENT = "poems";

/** The illustration's intrinsic size: 16:9, the poem page's full column width (design D5). */
export const ILLUSTRATION_WIDTH = 800;
export const ILLUSTRATION_HEIGHT = 450;

/**
 * `next/image` sizes for the illustration: the 896 px content column (`max-w-4xl`) once the
 * viewport is wide enough, below that the viewport minus the `px-6` gutters on both sides.
 */
export const ILLUSTRATION_SIZES = "(min-width: 944px) 896px, calc(100vw - 3rem)";

/** The optimizer doesn't serve SVG (Next's `dangerouslyAllowSVG` stays off), so these load as is. */
export const SVG_EXTENSION = ".svg";
