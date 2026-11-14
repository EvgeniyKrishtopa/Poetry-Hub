import { Button, TextField } from "@/shared/ui";

import { ADMIN_LIST_COPY } from "../../model/admin-messages";
import { ADMIN_LIST_PARAM, ADMIN_PATH } from "../../model/admin.constants";

import type { AdminUserFilterProps } from "./AdminUserFilter.types";

/** The exact-email filter: a plain GET form, so the filter lives in the URL and no JavaScript is needed (design D9). */
export function AdminUserFilter({ email }: AdminUserFilterProps) {
  return (
    <form action={ADMIN_PATH} method="get" className="flex flex-wrap items-end gap-2 self-stretch">
      <div className="min-w-0 flex-[1_1_15rem]">
        <TextField
          label={ADMIN_LIST_COPY.emailLabel}
          name={ADMIN_LIST_PARAM.email}
          type="email"
          autoComplete="off"
          defaultValue={email ?? ""}
        />
      </div>
      <Button type="submit">{ADMIN_LIST_COPY.findButton}</Button>
    </form>
  );
}
