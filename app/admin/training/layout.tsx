import { requireAdminSession } from "@/lib/rbac";

export default async function TrainingGateLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSession();
  return <>{children}</>;
}
