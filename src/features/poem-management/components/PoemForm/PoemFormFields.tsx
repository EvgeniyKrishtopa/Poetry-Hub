import { MarkdownEditor, TextField } from "@/shared/ui";

import { poemTextLength } from "../../model/poem-form.schema";
import { POEM_MANAGEMENT_COPY } from "../../model/poem-management-messages";
import { POEM_MARKDOWN_FORMATS, TEXT_MAX_LENGTH, TITLE_FIELD_NAME } from "../../model/poem-management.constants";

import { GenreSelect } from "./GenreSelect";
import { IllustrationField } from "./IllustrationField";
import type { PoemFormFieldsProps } from "./PoemFormFields.types";

/** Title, text, genre, and illustration, from the shared form state (edit-poem design D4). */
export function PoemFormFields({ fields, illustrationLabels, illustrationLayout }: PoemFormFieldsProps) {
  const {
    values,
    fieldErrors,
    genres,
    illustrationError,
    rendering: { fieldIds, editorKey, pickerKey },
    setTitle,
    setText,
    setGenreId,
    chooseIllustration,
    removeIllustration,
  } = fields;

  return (
    <>
      <TextField
        label={POEM_MANAGEMENT_COPY.titleLabel}
        name={TITLE_FIELD_NAME}
        type="text"
        autoComplete="off"
        value={values.title}
        onChange={(event) => setTitle(event.target.value)}
        error={fieldErrors.title}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={fieldIds.text} className="text-sm font-medium">
          {POEM_MANAGEMENT_COPY.textLabel}
        </label>
        <MarkdownEditor
          key={editorKey}
          id={fieldIds.text}
          value={values.text}
          onChange={setText}
          error={fieldErrors.text}
          length={poemTextLength(values.text)}
          maxLength={TEXT_MAX_LENGTH}
          formats={POEM_MARKDOWN_FORMATS}
          variant="poem"
        />
      </div>
      <GenreSelect
        id={fieldIds.genreId}
        value={values.genreId}
        genres={genres}
        error={fieldErrors.genreId}
        onChange={setGenreId}
      />
      <IllustrationField
        layout={illustrationLayout}
        id={fieldIds.illustration}
        pickerKey={pickerKey}
        illustration={values.illustration}
        error={illustrationError}
        labels={illustrationLabels}
        onFileChange={chooseIllustration}
        onRemove={removeIllustration}
      />
    </>
  );
}
