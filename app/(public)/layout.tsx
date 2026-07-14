import dynamic from "next/dynamic";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";

// Code-split off the initial JS bundle -- it's a closed floating widget with its own state,
// message history, and SVG orb animations, and nobody sees any of that on first paint. Keeping
// it out of the critical hydration path was worth ~2s of LCP render-delay on mobile.
const KnownAIChat = dynamic(() => import("@/components/chatbot/KnownAIChat"), { ssr: false });

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
