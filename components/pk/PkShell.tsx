import SiteNav from "./SiteNav";
import SiteFooter from "./SiteFooter";
import StickyActions from "./StickyActions";

// Page shell for the Direction 1 design system: nav, content, footer, mobile sticky actions.
export default function PkShell({ children, reportHref }: { children: React.ReactNode; reportHref?: string }) {
  return (
    <>
      <SiteNav />
      <div className="min-h-screen">{children}</div>
      <SiteFooter />
      <StickyActions reportHref={reportHref} />
    </>
  );
}
