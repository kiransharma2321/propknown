import { requireAdminSession } from "@/lib/rbac";

export default async function SettingsGateLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSession();
  return <>{children}</>;
}
