// Home shows no trail (FR-1). The slot must still match `/`, or a soft navigation home would keep the
// previous page's trail.
export default function HomeBreadcrumbs() {
  return null;
}
