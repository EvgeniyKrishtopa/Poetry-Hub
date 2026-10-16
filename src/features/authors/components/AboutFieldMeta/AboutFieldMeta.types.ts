export interface AboutFieldMetaProps {
  readonly error: string | undefined;
  readonly errorId: string;
  readonly counterId: string;
  /** The draft's length as validation counts it: code points after trimming. */
  readonly length: number;
}
