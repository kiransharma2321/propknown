import { requireAdminSession } from "@/lib/rbac";

export default async function DashboardGateLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSession();
  return <>{children}</>;
}
