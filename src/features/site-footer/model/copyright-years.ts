import { YEAR_RANGE_SEPARATOR } from "./site-footer.constants";

/**
 * The years part of the copyright notice: the founding year alone, or the founding year and the current
 * year joined by an en dash once the current year is later. A current year before the founding year (a
 * wrong server clock) also returns the founding year alone, so the range never runs backwards.
 */
export function formatCopyrightYears(foundingYear: number, currentYear: number): string {
  if (currentYear <= foundingYear) return String(foundingYear);
  return `${foundingYear}${YEAR_RANGE_SEPARATOR}${currentYear}`;
}
