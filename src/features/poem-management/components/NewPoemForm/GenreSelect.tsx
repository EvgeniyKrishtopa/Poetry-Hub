import { useId } from "react";

import { FIELD_INPUT_CLASS } from "@/shared/ui";

import { POEM_MANAGEMENT_COPY } from "../../model/poem-management-messages";
import { GENRE_PLACEHOLDER, NO_GENRE } from "../../model/poem-management.constants";

import type { GenreSelectProps } from "./GenreSelect.types";

/** The chevron's size in CSS pixels (the mockup's 16 px icon). */
const CHEVRON_SIZE = 16;

/** The genre dropdown: the placeholder first, the genres, then the no-genre option (FR-3). A native select, restyled. */
export function GenreSelect({ id, value, genres, error, onChange }: GenreSelectProps) {
  const errorId = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {POEM_MANAGEMENT_COPY.genreLabel}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`${FIELD_INPUT_CLASS} w-full appearance-none pr-9`}
        >
          <option value={GENRE_PLACEHOLDER}>{POEM_MANAGEMENT_COPY.genrePlaceholder}</option>
          {genres.map((genre) => (
            <option key={genre.id} value={genre.id}>
              {genre.name}
            </option>
          ))}
          <option value={NO_GENRE}>{POEM_MANAGEMENT_COPY.noGenreOption}</option>
        </select>
        {/* The native arrow is hidden by `appearance-none`; this one is decorative. */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
          width={CHEVRON_SIZE}
          height={CHEVRON_SIZE}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
      {error && (
        <p id={errorId} className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
