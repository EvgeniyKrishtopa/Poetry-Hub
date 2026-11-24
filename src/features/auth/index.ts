// Public API of the auth feature, imported only by Server Components and route handlers:
// `confirmSignUp` and `HeaderAuthLinks` reach server-only code, so a client import fails the build. The
// feature's own Client Components import their siblings by relative path (design D1).
export { HeaderAuthLinks } from "./components/HeaderAuthLinks/HeaderAuthLinks";
export { SignedOutOnly } from "./components/SignedOutOnly/SignedOutOnly";
export { SignInPanel } from "./components/SignInPanel/SignInPanel";
export { SignUpForm } from "./components/SignUpForm/SignUpForm";
export { confirmSignUp } from "./dal/confirm-sign-up";
export { finishGoogleSignIn } from "./dal/finish-google-sign-in";
export { getGoogleCallbackTarget } from "./model/google-callback-target";
export { getLoginPageMetadata, getSignupPageMetadata } from "./metadata/auth-pages-metadata";
export { CONFIRM_FAILED_ERROR, GOOGLE_FLOW_PARAM } from "./model/auth.constants";
export { getCurrentUserId, getSessionState, requireSession } from "./dal/current-user";
