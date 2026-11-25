import { Breadcrumbs } from "@/features/breadcrumbs";

export default function ResetPasswordBreadcrumbs() {
  return <Breadcrumbs segments={Promise.resolve(["reset-password"])} />;
}
