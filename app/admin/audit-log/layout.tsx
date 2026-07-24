import { requireAdminSession } from "@/lib/rbac";

export default async function AuditLogGateLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSession();
  return <>{children}</>;
}
