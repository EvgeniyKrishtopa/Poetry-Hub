import { AlignLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { IMAGE_QUALITY } from "@/shared/config/constants";
import { isUnoptimizableImage } from "@/shared/lib/image-file/is-unoptimizable-image";

import { PLACEHOLDER_ICON_SIZE, WORK_COVER_SIZES } from "../../model/home.constants";
import { formatWorkLinkName } from "../../model/home-messages";

import type { WorkCardProps } from "./WorkCard.types";


/**
 * One featured poem: a single link with the 16:9 cover (or the placeholder), the title and the author's name,
 * named «title, author» for assistive technology; the cover is decorative.
 */
export function WorkCard({ work }: WorkCardProps) {
  return (
    <Link
      href={work.href}
      aria-label={formatWorkLinkName(work.title, work.authorName)}
      className="flex h-full flex-col overflow-hidden rounded-card border border-card-border bg-card-bg transition-colors hover:bg-card-bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {/* A fixed 16:9 box, so the page does not shift while the cover loads. */}
      <div className="relative aspect-video w-full bg-surface">
        {work.coverUrl === null ? (
          <div aria-hidden="true" className="flex h-full items-center justify-center text-muted">
            <AlignLeft size={PLACEHOLDER_ICON_SIZE} strokeWidth={1.5} />
          </div>
        ) : (
          <Image
            className="object-cover"
            src={work.coverUrl}
            alt=""
            fill
            sizes={WORK_COVER_SIZES}
            quality={IMAGE_QUALITY}
            unoptimized={isUnoptimizableImage(work.coverUrl)}
          />
        )}
      </div>
      <div className="flex flex-col gap-1 p-4">
        <span className="text-lg/7 font-semibold">{work.title}</span>
        <span className="text-sm/5 text-muted">{work.authorName}</span>
      </div>
    </Link>
  );
}
