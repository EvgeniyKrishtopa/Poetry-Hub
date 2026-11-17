import { z } from "zod";

import { targetIdSchema } from "./admin.schema";
import { VIOLATION_CONTENT_KIND, VIOLATION_GROUND } from "./violation.constants";

// Shapes only: the message limits arrive with the warning action (task 3.4), which validates on the server before
// any RPC.

const groundSchema = z.enum([VIOLATION_GROUND.harmfulContent, VIOLATION_GROUND.maliciousActivity]);

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

export const sendWarningSchema = z.object({ caseId: targetIdSchema, message: z.string() });

export type AddViolationCaseInput = z.infer<typeof addViolationCaseSchema>;
export type AddViolationCaseForAuthorInput = z.infer<typeof addViolationCaseForAuthorSchema>;
export type SetCaseGroundInput = z.infer<typeof setCaseGroundSchema>;
export type CaseIdInput = z.infer<typeof caseIdSchema>;
export type SendWarningInput = z.infer<typeof sendWarningSchema>;
