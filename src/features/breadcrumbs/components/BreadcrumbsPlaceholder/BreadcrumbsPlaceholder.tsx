/** The trail's loading state: an empty row of the trail's height, hidden from assistive technology (NFR-4). */
export function BreadcrumbsPlaceholder() {
  return (
    <div aria-hidden="true" className="mx-auto w-full max-w-4xl px-6 pt-4">
      <div className="h-5" />
    </div>
  );
}
