import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import KnownAIChat from "@/components/chatbot/KnownAIChat";

// The public marketing site's chrome (nav, footer, WhatsApp button, KnownAI chat) lives here,
// scoped to the (public) route group, rather than in the root layout -- so /admin and /crm
// (internal tools, outside this group) don't inherit the public site's header/footer. This
// used to be in the root layout unconditionally; moving it here is what actually fixes that,
// now that app/admin/layout.tsx and app/crm/layout.tsx no longer render competing <html> tags
// that were accidentally (and invisibly) suppressing the leaked header before.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
      <WhatsAppButton />
      <KnownAIChat />
    </>
  );
}
