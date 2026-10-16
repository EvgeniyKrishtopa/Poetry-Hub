import Image from "next/image";

import { IMAGE_QUALITY } from "@/shared/config/constants";

import { getPhotoAlt } from "../../model/author-messages";
import { PHOTO_HEIGHT, PHOTO_SIZES, PHOTO_WIDTH } from "../../model/author.constants";
import { AuthorPhotoPlaceholder } from "../AuthorPhotoPlaceholder/AuthorPhotoPlaceholder";

import styles from "./AuthorPhoto.module.css";
import type { AuthorPhotoProps } from "./AuthorPhoto.types";
import { isLocalImageHost } from "./is-local-image-host";

/** The photo at 300 × 400 (full column width at 3:4 below 460 px), or the user-icon placeholder (FR-16). */
export function AuthorPhoto({ photoUrl, fullName }: AuthorPhotoProps) {
  return (
    <div className={styles.frame}>
      {photoUrl === null ? (
        <AuthorPhotoPlaceholder />
      ) : (
        <Image
          className={styles.image}
          src={photoUrl}
          alt={getPhotoAlt(fullName)}
          width={PHOTO_WIDTH}
          height={PHOTO_HEIGHT}
          sizes={PHOTO_SIZES}
          quality={IMAGE_QUALITY}
          // The page's largest above-the-fold element: fetch it with the HTML, not after layout,
          // which matters most on a slow mobile connection.
          preload
          unoptimized={isLocalImageHost(photoUrl)}
        />
      )}
    </div>
  );
}
