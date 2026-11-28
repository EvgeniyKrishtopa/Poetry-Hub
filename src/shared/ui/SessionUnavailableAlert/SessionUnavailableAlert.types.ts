export interface SessionUnavailableAlertProps {
  /** What «Повторить» does when the failure is a client request's; without it the route is re-read. */
  readonly onRetry?: () => void;
}
