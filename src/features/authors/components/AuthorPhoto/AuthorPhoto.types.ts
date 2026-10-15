export interface AuthorPhotoProps {
  /** `null` renders the user-icon placeholder. */
  readonly photoUrl: string | null;
  /** For the alt text "Фото: <full name>". */
  readonly fullName: string;
}
