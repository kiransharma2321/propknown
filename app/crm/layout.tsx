import { ToastProvider } from "@/components/ui/Toast";

// Internal tool, no public content to rank -- inherited the root layout's sitewide
// index:true/follow:true with no override, so /crm/* was indexable by Google.
export const metadata = { title: "PropKnown CRM", robots: { index: false, follow: false } };

// See app/admin/layout.tsx for the full explanation -- same bug, same fix: nested layouts
// can't render their own <html>/<body>, and the fonts here are already loaded globally by
// the root layout, so this is just the equivalent styling div in place of the old <body>.
export default function CRMLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-white min-h-screen" style={{ background: "var(--navy)", fontFamily: "Inter, sans-serif" }}>
      <ToastProvider>{children}</ToastProvider>
    </div>
  );
}
