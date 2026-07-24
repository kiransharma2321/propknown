import { requireAdminSession } from "@/lib/rbac";

export default async function UsersGateLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSession();
  return <>{children}</>;
}
