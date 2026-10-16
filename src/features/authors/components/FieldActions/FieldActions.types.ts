import type { FieldActionKind } from "../../model/author.types";

export interface FieldActionsProps {
  readonly hasValue: boolean;
  readonly pendingKind: FieldActionKind | null;
  /** Another field is being edited or has an action pending (FR-6). */
  readonly disabled: boolean;
  /** The empty field's prompt, from `ADD_PROMPTS`. */
  readonly addPrompt: string;
  /** The id of the field's error text, when it shows one. */
  readonly describedBy: string | undefined;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
}
