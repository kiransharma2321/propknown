import PkShell from "@/components/pk/PkShell";
import PageHero from "@/components/pk/PageHero";
import AreaPricePage from "@/app/(public)/ai-intelligence/[city]/[area]/page";

export const dynamic = "force-dynamic";

// Inner page preview: the real Kokapet area page (same data, same functions) in the new shell.
export default function AreaPreview() {
  return (
    <PkShell>
      <PageHero eyebrow="Area price guide · Hyderabad" title="Kokapet property prices"
        subtitle="Typical prices for each property type, each with its captured date, confidence level and real sources."
        crumbs={[{ label: "Home", href: "/design-preview/1" }, { label: "Prices", href: "/ai-intelligence" }, { label: "Kokapet" }]} />
      <div className="pk-inner"><AreaPricePage params={{ city: "hyderabad", area: "kokapet" }} /></div>
    </PkShell>
  );
}
