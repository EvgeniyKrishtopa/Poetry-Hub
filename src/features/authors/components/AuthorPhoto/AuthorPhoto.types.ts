export interface AuthorPhotoProps {
  /** `null` renders the user-icon placeholder. */
  readonly photoUrl: string | null;
  /** For the alt text built by `getPhotoAlt`. */
  readonly fullName: string;
}
