import { MarkdownEditor, TextField } from "@/shared/ui";

import { poemTextLength } from "../../model/poem-form.schema";
import { POEM_MANAGEMENT_COPY } from "../../model/poem-management-messages";
import { POEM_MARKDOWN_FORMATS, TEXT_MAX_LENGTH } from "../../model/poem-management.constants";

import { GenreSelect } from "./GenreSelect";
import { IllustrationField } from "./IllustrationField";
import type { PoemFormFieldsProps } from "./PoemFormFields.types";
import { TITLE_FIELD_NAME } from "./use-poem-form-focus";

/** Title, text, genre, and illustration, from the shared form state (edit-poem design D4). */
export function PoemFormFields({ form, illustrationLabels, illustrationLayout }: PoemFormFieldsProps) {
  const { values, fieldErrors } = form;
  const { fieldIds, editorKey, pickerKey } = form.rendering;

  return (
    <>
      <TextField
        label={POEM_MANAGEMENT_COPY.titleLabel}
        name={TITLE_FIELD_NAME}
        type="text"
        autoComplete="off"
        value={values.title}
        onChange={(event) => form.setTitle(event.target.value)}
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
          onChange={form.setText}
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
        genres={form.genres}
        error={fieldErrors.genreId}
        onChange={form.setGenreId}
      />
      <IllustrationField
        layout={illustrationLayout}
        id={fieldIds.illustration}
        pickerKey={pickerKey}
        illustration={values.illustration}
        error={form.illustrationError}
        labels={illustrationLabels}
        onFileChange={form.chooseIllustration}
        onRemove={form.removeIllustration}
      />
    </>
  );
}
