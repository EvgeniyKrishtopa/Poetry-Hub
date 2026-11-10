/** One `public.collections` row as the public read selects it (public-collections D5); the Zod schema lands in 4.2. */
export interface PublicCollectionRow {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  /** PostgREST sends `timestamptz` with an offset. */
  readonly created_at: string;
}
