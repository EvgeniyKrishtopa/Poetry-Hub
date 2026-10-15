import Image from "next/image";

import { getPhotoAlt } from "../../model/author-messages";
import { PHOTO_HEIGHT, PHOTO_SIZES, PHOTO_WIDTH } from "../../model/author.constants";

import styles from "./AuthorPhoto.module.css";
import type { AuthorPhotoProps } from "./AuthorPhoto.types";
import { isLocalImageHost } from "./is-local-image-host";

/** The placeholder's user icon, in CSS pixels (the mockup's 64 px stroke icon). */
const PLACEHOLDER_ICON_SIZE = 64;

/** The photo at 300 × 400 (full column width at 3:4 below 460 px), or the user-icon placeholder (FR-16). */
export function AuthorPhoto({ photoUrl, fullName }: AuthorPhotoProps) {
  if (photoUrl === null) {
    // Decorative: the page heading already names the author, so assistive technology skips it.
    return (
      <div aria-hidden="true" data-photo-placeholder className={`${styles.frame} flex items-center justify-center`}>
        <svg
          className="text-muted"
          width={PLACEHOLDER_ICON_SIZE}
          height={PLACEHOLDER_ICON_SIZE}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      </div>
    );
  }

  return (
    <div className={styles.frame}>
      <Image
        className={styles.image}
        src={photoUrl}
        alt={getPhotoAlt(fullName)}
        width={PHOTO_WIDTH}
        height={PHOTO_HEIGHT}
        sizes={PHOTO_SIZES}
        unoptimized={isLocalImageHost(photoUrl)}
      />
    </div>
  );
}
