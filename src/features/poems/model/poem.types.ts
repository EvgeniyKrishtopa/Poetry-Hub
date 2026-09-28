export interface Poem {
  readonly id: string;
  readonly title: string;
  readonly author: string;
  readonly lines: readonly string[];
}
