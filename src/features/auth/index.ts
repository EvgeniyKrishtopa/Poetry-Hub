// Public API of the auth feature, imported only by Server Components and route handlers:
// `confirmSignUp` and `HeaderAuthLinks` reach server-only code, so a client import fails the build. The
// feature's own Client Components import their siblings by relative path (design D1).
export { HeaderAuthLinks } from "./components/HeaderAuthLinks/HeaderAuthLinks";
export { SignedOutOnly } from "./components/SignedOutOnly/SignedOutOnly";
export { AuthNotice } from "./components/AuthNotice/AuthNotice";
export { GoogleSignInPanel } from "./components/GoogleSignInPanel/GoogleSignInPanel";
export { SignInPanel } from "./components/SignInPanel/SignInPanel";
export { SignUpForm } from "./components/SignUpForm/SignUpForm";
export { ResetPasswordPage } from "./components/ResetPasswordPage/ResetPasswordPage";
export { confirmRecovery } from "./dal/confirm-recovery";
export { confirmSignUp } from "./dal/confirm-sign-up";
export { CONFIRM_TYPE, getConfirmTarget } from "./model/confirm-target";
export { finishGoogleSignIn } from "./dal/finish-google-sign-in";
export { getGoogleCallbackTarget } from "./model/google-callback-target";
export {
  getLoginPageMetadata,
  getResetPasswordPageMetadata,
  getSignupPageMetadata,
} from "./metadata/auth-pages-metadata";
export {
  AUTH_NOTICE_PARAM,
  GOOGLE_FLOW_PARAM,
  RESET_STATUS_PARAM,
} from "./model/auth.constants";
export { getCurrentUserId, getSessionState, requireSession } from "./dal/current-user";
