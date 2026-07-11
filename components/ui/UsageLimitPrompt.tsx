import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

interface Props {
  returnTo: string;
}

// Shown when the anonymous 3-free-check limit is reached — reuses the existing buyer
// login/signup page entirely rather than a second auth form. "next" brings the visitor back
// to the tool they were using after logging in (they'll need to re-run their query, since we
// don't round-trip form state — a reasonable, disclosed trade-off, not a hidden one).
export default function UsageLimitPrompt({ returnTo }: Props) {
  return (
    <div className="border rounded-2xl p-6 text-center" style={{ borderColor: "rgba(214,166,62,0.4)", background: "rgba(214,166,62,0.05)" }}>
      <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(214,166,62,0.15)" }}>
        <Sparkles size={20} style={{ color: "var(--gold-text)" }} />
      </div>
      <p className="heading-h3 mb-1">You&apos;ve used your 3 free AI checks</p>
      <p className="text-gray-500 text-sm mb-5 leading-relaxed">
        Create a free PropKnown account to continue using AI-powered tools — no cost, just a quick signup.
      </p>
      <Link href={`/account/login?next=${encodeURIComponent(returnTo)}`} className="btn-primary">
        Log In / Sign Up — It&apos;s Free <ArrowRight size={16} />
      </Link>
    </div>
  );
}
