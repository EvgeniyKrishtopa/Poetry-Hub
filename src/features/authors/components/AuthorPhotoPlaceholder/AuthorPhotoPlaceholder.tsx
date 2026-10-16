/** The placeholder's user icon, in CSS pixels (the mockup's 64 px stroke icon). */
const PLACEHOLDER_ICON_SIZE = 64;

/** The user icon that fills `AuthorPhoto`'s frame when the author has no photo (FR-16). */
export function AuthorPhotoPlaceholder() {
  // Decorative: the page heading already names the author, so assistive technology skips it.
  return (
    <div aria-hidden="true" data-photo-placeholder className="flex h-full items-center justify-center">
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
