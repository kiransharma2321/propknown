import SiteNav from "./SiteNav";
import Footer from "@/components/layout/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import ChatLauncher from "@/components/chatbot/ChatLauncher";
import StickyActions from "./StickyActions";

// Page shell for the Direction 1 restyle: the same chrome as app/(public)/layout.tsx (nav,
// footer, WhatsApp button, Ask KnownAI), restyled, plus the mobile sticky action bar.
export default function PkShell({ children, reportHref, overHero = false }: { children: React.ReactNode; reportHref?: string; overHero?: boolean }) {
  return (
    <div className="pk-skin">
      <SiteNav overHero={overHero} />
      <div className="min-h-screen">{children}</div>
      <div className="pk-footer"><Footer /></div>
      <WhatsAppButton />
      <ChatLauncher />
      <StickyActions reportHref={reportHref} />
    </div>
  );
}
