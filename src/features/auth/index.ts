// Public API of the auth feature, imported only by Server Components and route handlers.
// The feature's own Client Components import their siblings by relative path (design D1).
export { SignInForm } from "./components/SignInForm/SignInForm";
export { SignUpForm } from "./components/SignUpForm/SignUpForm";
export { getLoginErrorMessage } from "./model/auth-messages";
