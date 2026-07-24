import { requireAdminSession } from "@/lib/rbac";

export default async function BulkImportGateLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSession();
  return <>{children}</>;
}
