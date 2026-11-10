import PkShell from "@/components/pk/PkShell";
import HomePage from "@/components/pk/HomePage";

// Direction 1 homepage preview: the same component the real homepage renders.
export const dynamic = "force-dynamic";

export default function HomePreview() {
  return (
    <PkShell overHero>
      <div className="pk-inner"><HomePage /></div>
    </PkShell>
  );
}
