import { ABOUT_MAX_LENGTH } from "../../model/author.constants";
import { formatAboutCounter } from "../../model/author-messages";
import { FieldErrorText } from "../FieldErrorText/FieldErrorText";

import type { AboutFieldMetaProps } from "./AboutFieldMeta.types";

/** Under the textarea: the field error on the left, the character counter on the right (FR-8, FR-11). */
export function AboutFieldMeta({ error, errorId, counterId, length }: AboutFieldMetaProps) {
  const counterTone = length > ABOUT_MAX_LENGTH ? "font-medium text-danger" : "text-muted";

  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      {error && <FieldErrorText id={errorId} message={error} />}
      <p id={counterId} className={`ml-auto text-sm tabular-nums ${counterTone}`}>
        {formatAboutCounter(length)}
      </p>
    </div>
  );
}
