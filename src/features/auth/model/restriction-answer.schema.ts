import { z } from "zod";

/** Anything but a boolean fails the parse, so a changed return shape of `is_restricted()` keeps the page closed. */
export const restrictionAnswerSchema = z.boolean();
