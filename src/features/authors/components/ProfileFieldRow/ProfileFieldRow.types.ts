import type { ReactNode } from "react";

export interface ProfileFieldRowProps {
  /**
   * The first column's caption in view mode. In edit mode it is `undefined`: the control's own
   * `<label>` takes the first column instead (`TextField` with `layout="columns"`, or `label`).
   */
  readonly caption?: string;
  /** Rendered before `children` as direct grid items, e.g. a `TextField` in its columns layout. */
  readonly control?: ReactNode;
  /** The second column's content: value, preview, error, buttons. */
  readonly children: ReactNode;
}
