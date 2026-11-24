import type { GoogleSignInPanelProps } from "./GoogleSignInPanel.types";

/**
 * The Google button with the URL's notice as its `initialError`. `error` is request-time data, so it is
 * awaited only inside a Suspense boundary whose fallback is the same button without one (design D6).
 */
export function GoogleSignInPanel(props: GoogleSignInPanelProps): null {
  void props;
  return null;
}
