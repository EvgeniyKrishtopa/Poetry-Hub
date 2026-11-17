export interface AdminPageContentProps {
  readonly query: Promise<Record<string, string | string[] | undefined>>;
}
