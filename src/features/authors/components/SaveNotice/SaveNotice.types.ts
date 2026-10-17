export interface SaveNoticeProps {
  /** Empty while a save is pending; `SAVED_MESSAGE` after a success. */
  readonly message: string;
}
