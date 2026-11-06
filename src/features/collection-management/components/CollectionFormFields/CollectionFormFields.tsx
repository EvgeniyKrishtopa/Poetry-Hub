import { TextAreaField, TextField } from "@/shared/ui";

import { COLLECTION_FORM_COPY } from "../../model/collection-management-messages";
import { COLLECTION_FIELD } from "../../model/collection-management.constants";

import type { CollectionFormFieldsProps } from "./CollectionFormFields.types";

/** The title field and the description text area both forms render (design D5). */
export function CollectionFormFields({ form }: CollectionFormFieldsProps) {
  const { values, fieldErrors, setTitle, setDescription } = form;

  return (
    <>
      <TextField
        label={COLLECTION_FORM_COPY.titleLabel}
        name={COLLECTION_FIELD.title}
        type="text"
        autoComplete="off"
        value={values.title}
        onChange={(event) => setTitle(event.target.value)}
        error={fieldErrors.title}
      />
      <TextAreaField
        label={COLLECTION_FORM_COPY.descriptionLabel}
        name={COLLECTION_FIELD.description}
        value={values.description}
        onChange={(event) => setDescription(event.target.value)}
        error={fieldErrors.description}
      />
    </>
  );
}
