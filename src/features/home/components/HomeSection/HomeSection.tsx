import type { HomeSectionProps } from "./HomeSection.types";

/**
 * One band of the home page: the section rhythm above and below, and the content in the wide or the reading
 * column. A surface band carries a top line, so two surface bands in a row (the authors section absent) stay
 * apart while keeping their padding.
 */
export function HomeSection({ tone = "plain", width = "wide", children }: HomeSectionProps) {
  const toneClasses = tone === "surface" ? "border-t border-border bg-surface" : "";
  const columnClass = width === "wide" ? "max-w-measure-wide" : "max-w-measure-text";

  return (
    <section className={`${toneClasses} py-(--section-y)`}>
      <div className={`mx-auto flex w-full flex-col gap-8 px-6 ${columnClass}`}>{children}</div>
    </section>
  );
}
