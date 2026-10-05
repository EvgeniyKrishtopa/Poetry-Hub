"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import type { AuthFailedResult, AuthFailure, SignInResult, SignOutResult, SignUpResult } from "../model/auth.types";
import { classifyAuthError } from "../model/classify-auth-error";
import { signInSchema, signUpSchema } from "../model/credentials.schema";

import { authActionClient } from "./action-client";

const HOME_PATH = "/";

function failed(failure: AuthFailure): AuthFailedResult {
  return { status: "failed", failure };
}

/**
 * Creates the server client, or returns the failure for a missing config. Any other error
 * propagates to the action client's `handleServerError` (design D2).
 */
async function createClientOrFailure(): Promise<
  { readonly supabase: SupabaseClient } | { readonly failure: AuthFailure }
> {
  try {
    return { supabase: await createSupabaseServerClient() };
  } catch (error) {
    if (error instanceof SupabaseConfigError) return { failure: classifyAuthError(error) };
    throw error;
  }
}

// implements FR-2 of add-supabase-auth
export const signInAction = authActionClient
  .inputSchema(signInSchema)
  .action(async ({ parsedInput }): Promise<SignInResult> => {
    const client = await createClientOrFailure();
    if ("failure" in client) return failed(client.failure);

    const { error } = await client.supabase.auth.signInWithPassword(parsedInput);
    if (error) return failed(classifyAuthError(error));

    // Outside every try: `redirect` throws NEXT_REDIRECT, which a catch would swallow (Gate 1 P1).
    // The server client's setAll has already written the session cookies.
    redirect(HOME_PATH);
  });

// implements FR-4 of add-supabase-auth
export const signUpAction = authActionClient
  .inputSchema(signUpSchema)
  .action(async ({ parsedInput }): Promise<SignUpResult> => {
    const client = await createClientOrFailure();
    if ("failure" in client) return failed(client.failure);

    const { error } = await client.supabase.auth.signUp(parsedInput);
    if (error) return failed(classifyAuthError(error));

    // The same answer whatever `data.user.identities` holds, so an existing address isn't revealed.
    return { status: "check-email", email: parsedInput.email };
  });

// implements FR-7 of add-supabase-auth
export const signOutAction = authActionClient.action(async (): Promise<SignOutResult> => {
  const client = await createClientOrFailure();
  if ("failure" in client) return { ok: false };

  // `local` ends this device's session only; the default `global` would sign out everywhere.
  const { error } = await client.supabase.auth.signOut({ scope: "local" });
  return { ok: !error };
});
