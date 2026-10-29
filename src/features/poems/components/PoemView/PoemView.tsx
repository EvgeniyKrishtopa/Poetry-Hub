import Image from "next/image";

import { CONTENT_LANG, IMAGE_QUALITY } from "@/shared/config/constants";
import { isUnoptimizableImage } from "@/shared/lib/image-file/is-unoptimizable-image";
import { MarkdownText } from "@/shared/ui";

import { formatPublishedDate } from "../../model/format-published-date";
import { ILLUSTRATION_HEIGHT, ILLUSTRATION_SIZES, ILLUSTRATION_WIDTH } from "../../model/poem.constants";
import { formatGenreLine, getIllustrationAlt } from "../../model/poems-messages";

import type { PoemViewProps } from "./PoemView.types";

/**
 * One poem: the illustration when it has one, title heading, the text as poem Markdown, then the date
 * and, when named, the genre footer. Raw HTML in the text is skipped and links show as their text
 * (add-poem-creation NFR-5).
 */
export function PoemView({ poem, genre }: PoemViewProps) {
  return (
    <article lang={CONTENT_LANG} className="flex flex-col gap-8">
      {poem.illustrationUrl !== null && (
        <Image
          // A 16:9 frame the image fills, cropped at its edges when its own proportions differ.
          className="aspect-video w-full rounded-2xl bg-surface object-cover"
          src={poem.illustrationUrl}
          alt={getIllustrationAlt(poem.title)}
          width={ILLUSTRATION_WIDTH}
          height={ILLUSTRATION_HEIGHT}
          sizes={ILLUSTRATION_SIZES}
          quality={IMAGE_QUALITY}
          unoptimized={isUnoptimizableImage(poem.illustrationUrl)}
          // The page's largest above-the-fold element: fetch it with the HTML, not after layout.
          preload
        />
      )}
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{poem.title}</h1>
      <MarkdownText markdown={poem.text} variant="poem" />
      <footer className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        <time dateTime={poem.publishedAt}>{formatPublishedDate(poem.publishedAt)}</time>
        {genre.kind === "named" && <span>{formatGenreLine(genre.name)}</span>}
      </footer>
    </article>
  );
}
