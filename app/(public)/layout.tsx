import SiteNav from "@/components/pk/SiteNav";
import StickyActions from "@/components/pk/StickyActions";
import { LangProvider } from "@/components/i18n/LangProvider";
import Footer from "@/components/layout/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import ChatLauncher from "@/components/chatbot/ChatLauncher";

// ChatLauncher renders just the closed-state button/pill and only dynamically imports the real
// KnownAIChat component (message state, quick replies, send/fetch logic) on hover/focus/click --
// previously this loaded and mounted on every homepage visit regardless of whether anyone ever
// touched it.

// The public marketing site's chrome (nav, footer, WhatsApp button, KnownAI chat) lives here,
// scoped to the (public) route group, rather than in the root layout -- so /admin and /crm
// (internal tools, outside this group) don't inherit the public site's header/footer. This
// used to be in the root layout unconditionally; moving it here is what actually fixes that,
// now that app/admin/layout.tsx and app/crm/layout.tsx no longer render competing <html> tags
// that were accidentally (and invisibly) suppressing the leaked header before.
// Direction 1 restyle: SiteNav is components/layout/Header.tsx restyled (same items, order and
// links, plus new entries inside its dropdowns); .pk-skin/.pk-inner/.pk-footer (globals.css)
// restyle colours, buttons, cards and the footer without changing any content. StickyActions
// adds the mobile WhatsApp / Call / Get Report bar.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <LangProvider>
    <div className="pk-skin pb-16 md:pb-0">
      <SiteNav />
      <main className="pk-inner">{children}</main>
      <div className="pk-footer"><Footer /></div>
      <WhatsAppButton />
      <ChatLauncher />
      <StickyActions />
    </div>
    </LangProvider>
  );
}
