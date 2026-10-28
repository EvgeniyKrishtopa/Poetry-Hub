import Image from "next/image";

import { CONTENT_LANG, IMAGE_QUALITY } from "@/shared/config/constants";
import { splitParagraphs } from "@/shared/lib/split-paragraphs";

import { formatPublishedDate } from "../../model/format-published-date";
import { ILLUSTRATION_HEIGHT, ILLUSTRATION_SIZES, ILLUSTRATION_WIDTH } from "../../model/poem.constants";
import { formatGenreLine, getIllustrationAlt } from "../../model/poems-messages";

import type { PoemViewProps } from "./PoemView.types";

/**
 * One poem: the illustration when it has one, title heading, stanzas, then the date and, when named,
 * the genre footer. The text is plain: React escapes it, so Markdown or HTML in it shows literally.
 */
export function PoemView({ poem, genre }: PoemViewProps) {
  return (
    <article lang={CONTENT_LANG} className="flex flex-col gap-8">
      {poem.illustrationUrl !== null && (
        <Image
          className="h-auto w-full rounded-2xl bg-surface"
          src={poem.illustrationUrl}
          alt={getIllustrationAlt(poem.title)}
          width={ILLUSTRATION_WIDTH}
          height={ILLUSTRATION_HEIGHT}
          sizes={ILLUSTRATION_SIZES}
          quality={IMAGE_QUALITY}
          // The page's largest above-the-fold element: fetch it with the HTML, not after layout.
          preload
        />
      )}
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{poem.title}</h1>
      <div className="flex flex-col gap-6 text-base leading-[1.7] italic sm:text-lg">
        {splitParagraphs(poem.text).map((stanza, index) => (
          <p key={index} className="whitespace-pre-line">
            {stanza}
          </p>
        ))}
      </div>
      <footer className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        <time dateTime={poem.publishedAt}>{formatPublishedDate(poem.publishedAt)}</time>
        {genre.kind === "named" && <span>{formatGenreLine(genre.name)}</span>}
      </footer>
    </article>
  );
}
