import type { AboutView } from "../AboutFieldEditor/AboutFieldEditor.types";

export interface AboutViewTabsProps {
  readonly value: AboutView;
  readonly onChange: (view: AboutView) => void;
  /** The id of the panel both tabs control. */
  readonly panelId: string;
}
