// Public API of the auth feature, imported only by Server Components and route handlers:
// `confirmSignUp` is server-only, so a client import fails the build. The feature's own
// Client Components import their siblings by relative path (design D1).
export { SignInForm } from "./components/SignInForm/SignInForm";
export { SignUpForm } from "./components/SignUpForm/SignUpForm";
export { confirmSignUp } from "./dal/confirm-sign-up";
export { CONFIRM_FAILED_ERROR, getLoginErrorMessage } from "./model/auth-messages";
