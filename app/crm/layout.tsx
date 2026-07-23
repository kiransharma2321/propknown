import { ToastProvider } from "@/components/ui/Toast";

// Internal tool, no public content to rank -- inherited the root layout's sitewide
// index:true/follow:true with no override, so /crm/* was indexable by Google.
export const metadata = { title: "PropKnown CRM", robots: { index: false, follow: false } };

// See app/admin/layout.tsx for the full explanation -- same bug, same fix: nested layouts
// can't render their own <html>/<body>, and the fonts here are already loaded globally by
// the root layout, so this is just the equivalent styling div in place of the old <body>.
// Reskin note: bg-gray-50 + text-gray-900 is the exact page-background/text pairing used
// behind white cards site-wide (see components/sections/PriceCheckTeaser.tsx,
// ServicesSection.tsx) -- not a new token invented for the CRM.
export default function CRMLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-gray-900 min-h-screen bg-gray-50" style={{ fontFamily: "var(--font-montserrat, Inter, sans-serif)" }}>
      <ToastProvider>{children}</ToastProvider>
    </div>
  );
}
