/**
 * Invalid or missing Supabase env vars. The message and `variables` carry variable names only,
 * never their values.
 */
export class SupabaseConfigError extends Error {
  readonly variables: readonly string[];

  constructor(variables: readonly string[]) {
    super(`Invalid Supabase configuration: ${variables.join(", ")}`);
    this.name = "SupabaseConfigError";
    this.variables = variables;
  }
}
