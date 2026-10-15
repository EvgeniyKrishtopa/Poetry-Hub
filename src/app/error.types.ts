export interface RootErrorProps {
  error: Error & { digest?: string };
  retry: () => void;
}
