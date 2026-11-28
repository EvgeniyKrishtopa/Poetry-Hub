import { z } from "zod";

import { TOTP_CODE_LENGTH } from "./admin.constants";

const CODE_PATTERN = new RegExp(`^\\d{${TOTP_CODE_LENGTH}}$`);

export const totpCodeSchema = z.object({
  factorId: z.uuid(),
  code: z.string().trim().regex(CODE_PATTERN),
});

export type TotpCodeInput = z.infer<typeof totpCodeSchema>;
