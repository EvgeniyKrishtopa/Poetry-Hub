import { describe, expect, it } from "vitest";

import * as supabase from "../index";

describe("@/shared/lib/supabase", () => {
  // implements FR-5 of remove-browser-session-read
  it("exports only SupabaseConfigError", () => {
    expect(Object.keys(supabase)).toEqual(["SupabaseConfigError"]);
  });
});
