import { ToastProvider } from "@/components/ui/Toast";

// Internal tool, no public content to rank -- inherited the root layout's sitewide
// index:true/follow:true with no override, so /admin/* was indexable by Google.
export const metadata = { title: "PropKnown Admin", robots: { index: false, follow: false } };

// Admin-separation gate (session required to reach any protected /admin/* page) is NOT here --
// this layout also wraps app/admin/page.tsx, the public login form, and Next gives layouts no
// pathname to exempt it with. See lib/rbac.ts's requireAdminSession() and the layout.tsx it's
// called from in each protected subdirectory (dashboard, users, settings, bulk-import,
// audit-log, training).

// Nested layouts must NOT render their own <html>/<head>/<body> -- only the root layout
// (app/layout.tsx) may. This used to do exactly that, which produced two nested <html> roots
// and broke React hydration on every /admin page. The Playfair Display + Inter fonts it was
// trying to load are already loaded globally by the root layout (same family, same weights),
// so nothing is lost by dropping the duplicate <link> -- this div just carries the same dark
// theme the old <body> applied.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-gray-900 min-h-screen bg-gray-50" style={{ fontFamily: "var(--font-montserrat, Inter, sans-serif)" }}>
      <ToastProvider>{children}</ToastProvider>
    </div>
  );
}
