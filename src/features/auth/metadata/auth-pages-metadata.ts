import "server-only";

import type { Metadata } from "next";

import { RESET_PASSWORD_PATH, SIGN_IN_PATH, SIGN_UP_PATH } from "@/shared/config/account-paths";
import { buildNoIndexMetadata } from "@/shared/lib/seo";

import { RESET_PASSWORD_PAGE_TITLE, SIGN_IN_PAGE_TITLE, SIGN_UP_PAGE_TITLE } from "../model/auth-messages";

/** `/login`: a title, a canonical and `noindex, follow`; no description and no card (FR-7). */
export function getLoginPageMetadata(): Metadata {
  return buildNoIndexMetadata({ title: SIGN_IN_PAGE_TITLE, follow: true, canonicalPath: SIGN_IN_PATH });
}

/** `/reset-password`: a plain title, a canonical and `noindex, follow`; no description and no card (password-recovery FR-12). */
export function getResetPasswordPageMetadata(): Metadata {
  return buildNoIndexMetadata({ title: RESET_PASSWORD_PAGE_TITLE, follow: true, canonicalPath: RESET_PASSWORD_PATH });
}

/** `/signup`: the same shape as the login page (FR-7). */
export function getSignupPageMetadata(): Metadata {
  return buildNoIndexMetadata({ title: SIGN_UP_PAGE_TITLE, follow: true, canonicalPath: SIGN_UP_PATH });
}
