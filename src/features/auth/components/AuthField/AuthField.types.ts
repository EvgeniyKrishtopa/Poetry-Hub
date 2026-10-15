export interface AuthFieldProps {
  readonly label: string;
  readonly name: "email" | "password";
  readonly type: "email" | "password";
  readonly autoComplete: "email" | "current-password" | "new-password";
  readonly defaultValue?: string;
  readonly error?: string;
}
