export const metadata = { title: "PropKnown CRM" };

// See app/admin/layout.tsx for the full explanation -- same bug, same fix: nested layouts
// can't render their own <html>/<body>, and the fonts here are already loaded globally by
// the root layout, so this is just the equivalent styling div in place of the old <body>.
export default function CRMLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-black text-white min-h-screen" style={{ fontFamily: "Inter, sans-serif" }}>
      {children}
    </div>
  );
}
