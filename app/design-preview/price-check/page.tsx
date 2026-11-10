import PkShell from "@/components/pk/PkShell";
import PageHero from "@/components/pk/PageHero";
import PriceCheckPage from "@/app/(public)/price-check/page";

// Inner page preview: the real Price Check (unchanged logic) inside the Direction 1 shell.
export default function PriceCheckPreview() {
  return (
    <PkShell reportHref="#report">
      <PageHero eyebrow="Price Reality Check" title={<>Is that price <em style={{ color: "#D6A63E" }}>fair?</em></>}
        subtitle="Any area, project or quote — checked against live market data, with sources, dates and a confidence level."
        crumbs={[{ label: "Home", href: "/design-preview/1" }, { label: "Tools" }, { label: "Price Check" }]} />
      <div className="pk-inner"><PriceCheckPage /></div>
    </PkShell>
  );
}
