import { listQuerySchema, type ListQuery } from "./admin.schema";

/** The page's raw URL parameters as a list query; a repeated or odd parameter is ignored, never an error screen. */
export function readListQuery(raw: Record<string, string | string[] | undefined>): ListQuery {
  const parsed = listQuerySchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  return {
    after: typeof raw.after === "string" ? raw.after : undefined,
    email: typeof raw.email === "string" ? raw.email : undefined,
  };
}
