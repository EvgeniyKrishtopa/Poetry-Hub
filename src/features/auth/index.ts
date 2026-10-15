// Public API of the auth feature, imported only by Server Components and route handlers:
// `confirmSignUp` and `HeaderSession` reach server-only code, so a client import fails the build. The
// feature's own Client Components import their siblings by relative path (design D1).
export { HeaderSession } from "./components/HeaderSession/HeaderSession";
export { SignInForm } from "./components/SignInForm/SignInForm";
export { SignInFormWithError } from "./components/SignInFormWithError/SignInFormWithError";
export { SignUpForm } from "./components/SignUpForm/SignUpForm";
export { confirmSignUp } from "./dal/confirm-sign-up";
export { CONFIRM_FAILED_ERROR } from "./model/auth.constants";
