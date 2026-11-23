import { User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { IMAGE_QUALITY } from "@/shared/config/constants";
import { isUnoptimizableImage } from "@/shared/lib/image-file/is-unoptimizable-image";

import { AUTHOR_PHOTO_SIZE, PLACEHOLDER_ICON_SIZE } from "../../model/home.constants";

import type { AuthorCardProps } from "./AuthorCard.types";


/**
 * One project author: a single link with the round photo (or the muted user icon), the name and, when there is
 * one, the short description; the photo is decorative. A row on narrow screens, a centred column from the tablet.
 */
export function AuthorCard({ author }: AuthorCardProps) {
  return (
    <Link
      href={author.href}
      className="flex h-full items-center gap-4 rounded-card border border-card-border bg-card-bg p-6 transition-colors hover:bg-card-bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:flex-col md:text-center"
    >
      <div className="relative size-24 shrink-0 overflow-hidden rounded-full bg-surface">
        {author.photoUrl === null ? (
          <div aria-hidden="true" className="flex h-full items-center justify-center text-muted">
            <User size={PLACEHOLDER_ICON_SIZE} strokeWidth={1.5} />
          </div>
        ) : (
          <Image
            className="object-cover"
            src={author.photoUrl}
            alt=""
            fill
            sizes={`${AUTHOR_PHOTO_SIZE}px`}
            quality={IMAGE_QUALITY}
            unoptimized={isUnoptimizableImage(author.photoUrl)}
          />
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-lg/7 font-semibold [overflow-wrap:anywhere]">{author.name}</span>
        {author.description !== null && <span className="text-sm/5 text-muted">{author.description}</span>}
      </div>
    </Link>
  );
}
