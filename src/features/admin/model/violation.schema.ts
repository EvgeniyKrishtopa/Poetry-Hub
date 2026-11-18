import { z } from "zod";

import { trimmedLength } from "@/shared/lib/text/trimmed-length";

import { targetIdSchema } from "./admin.schema";
import { VIOLATION_CONTENT_KIND, VIOLATION_GROUND, WARNING_MESSAGE_MAX_LENGTH } from "./violation.constants";

/** The two grounds, as the database spells them; also what the DAL accepts back from it. */
export const groundSchema = z.enum([VIOLATION_GROUND.harmfulContent, VIOLATION_GROUND.maliciousActivity]);

const contentSchema = z.object({
  kind: z.enum([VIOLATION_CONTENT_KIND.poem, VIOLATION_CONTENT_KIND.collection]),
  id: targetIdSchema,
});

/** The add action's input from the `/admin` list, where the user's id is known. */
export const addViolationCaseSchema = z.object({
  userId: targetIdSchema,
  ground: groundSchema,
  content: contentSchema.optional(),
});

/** The add action's input from the public pages, which know a profile id and not an auth user id. */
export const addViolationCaseForAuthorSchema = z.object({
  authorProfileId: targetIdSchema,
  ground: groundSchema,
  content: contentSchema.optional(),
});

export const setCaseGroundSchema = z.object({ caseId: targetIdSchema, ground: groundSchema });

export const caseIdSchema = z.object({ caseId: targetIdSchema });

/** The warning's input: the message is required, trimmed and at most `WARNING_MESSAGE_MAX_LENGTH` code points. */
export const sendWarningSchema = z.object({
  caseId: targetIdSchema,
  message: z
    .string()
    .trim()
    .min(1)
    .refine((message) => trimmedLength(message) <= WARNING_MESSAGE_MAX_LENGTH),
});

export type AddViolationCaseInput = z.infer<typeof addViolationCaseSchema>;
export type AddViolationCaseForAuthorInput = z.infer<typeof addViolationCaseForAuthorSchema>;
export type SetCaseGroundInput = z.infer<typeof setCaseGroundSchema>;
export type CaseIdInput = z.infer<typeof caseIdSchema>;
export type SendWarningInput = z.infer<typeof sendWarningSchema>;
