import PkShell from "@/components/pk/PkShell";
import AreaPricePage from "@/app/(public)/ai-intelligence/[city]/[area]/page";

export const dynamic = "force-dynamic";

// Inner page preview: the real Kokapet area page (same content, same data) in the restyled shell.
export default function AreaPreview() {
  return (
    <PkShell>
      <div className="pk-inner"><AreaPricePage params={{ city: "hyderabad", area: "kokapet" }} /></div>
    </PkShell>
  );
}
