import PkShell from "@/components/pk/PkShell";
import PriceCheckPage from "@/app/(public)/price-check/page";

// Inner page preview: the real Price Check page (same content, same logic) in the restyled shell.
export default function PriceCheckPreview() {
  return (
    <PkShell reportHref="#report">
      <div className="pk-inner"><PriceCheckPage /></div>
    </PkShell>
  );
}
