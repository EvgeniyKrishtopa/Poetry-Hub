import Image from "next/image";

import { AUTHORS_PATH } from "@/features/authors";
import { SIGN_UP_PATH } from "@/shared/config/account-paths";
import { IMAGE_QUALITY } from "@/shared/config/constants";
import { splitParagraphs } from "@/shared/lib/split-paragraphs";
import { ButtonLink } from "@/shared/ui";

import { HERO_COPY } from "../../model/home-messages";

import styles from "./HomeHero.module.css";
import type { HomeHeroProps } from "./HomeHero.types";

/** The hero's image sizes: it spans the viewport at every width. */
const HERO_IMAGE_SIZES = "100vw";

/**
 * The first section: the full-bleed photo under the scrim, the banner's title as the page's one `h1` with its
 * text as plain-text paragraphs (line breaks kept, nothing parsed as Markdown), and the two buttons, all centred.
 * The photo, from the CMS or the shipped fallback, is decorative (empty `alt`).
 */
export function HomeHero({ banner }: HomeHeroProps) {
  const paragraphs = splitParagraphs(banner.text);

  return (
    <section className={styles.hero}>
      <Image
        className={styles.image}
        src={banner.imageSrc}
        alt=""
        fill
        sizes={HERO_IMAGE_SIZES}
        quality={IMAGE_QUALITY}
        // The page's largest above-the-fold element: fetch it with the HTML, not after layout.
        preload
      />
      <div className={styles.scrim} />
      <div className="mx-auto flex w-full max-w-measure-wide flex-col items-center gap-8 px-6">
        <div className="flex max-w-180 flex-col gap-6">
          <h1 className={styles.title}>{banner.title}</h1>
          <div className="flex flex-col gap-4">
            {paragraphs.map((paragraph, index) => (
              <p key={index} className={styles.message}>
                {paragraph}
              </p>
            ))}
          </div>
        </div>
        <div className="flex w-full flex-col justify-center gap-4 sm:w-auto sm:flex-row">
          <ButtonLink href={AUTHORS_PATH} size="lg" className="w-full sm:w-auto">
            {HERO_COPY.readWorks}
          </ButtonLink>
          <ButtonLink href={SIGN_UP_PATH} variant="onImage" size="lg" className="w-full sm:w-auto">
            {HERO_COPY.becomeAuthor}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
