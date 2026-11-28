const GROUP_PATTERN = /.{1,4}/g;

/** The secret in groups of four, the way an authenticator app asks for it to be typed. */
export function groupTotpSecret(secret: string): string {
  const groups = secret.match(GROUP_PATTERN) ?? [];
  return groups.join(" ");
}
