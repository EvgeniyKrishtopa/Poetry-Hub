/**
 * The answer to "leave this page with unsaved changes?" (edit-poem design D10):
 * - `leave`: the author chose to leave;
 * - `stay`: the author chose to stay, so the asker puts focus back on its own control;
 * - `dismissed`: the page took over the question and focus (it was hidden, saved, or shows an error).
 */
export const LEAVE_ANSWER = {
  leave: "leave",
  stay: "stay",
  dismissed: "dismissed",
} as const;

export type LeaveAnswer = (typeof LEAVE_ANSWER)[keyof typeof LEAVE_ANSWER];
