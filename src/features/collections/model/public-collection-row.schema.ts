/**
 * One `public.collections` row as the public read selects it (public-collections D5). Task 4.1 replaces this interface
 * with the Zod schema and `z.infer`, as `poems/model/poem-row.schema.ts` does, so the shape exists once.
 */
export interface PublicCollectionRow {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  /** PostgREST sends `timestamptz` with an offset. */
  readonly created_at: string;
}
