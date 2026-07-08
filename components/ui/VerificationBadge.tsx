import { CheckCircle, Clock, Shield, ExternalLink } from "lucide-react";
import Link from "next/link";

export interface VerificationFlags {
  reraVerified?: boolean;
  reraNumber?: string;
  titleVerified?: boolean;
  documentsChecked?: boolean;
  layoutApproved?: boolean;  // HMDA / DTCP
  layoutBadge?: string;      // "HMDA" | "DTCP" etc.
  encumbranceClear?: boolean;
  propknownVerified?: boolean; // overall PropKnown stamp
}

const CHECKS: { key: keyof VerificationFlags; label: string; desc: string }[] = [
  { key: "reraVerified",      label: "RERA Registered",       desc: "Project/builder RERA-registered" },
  { key: "titleVerified",     label: "Title / Ownership Clear", desc: "Title deed & ownership chain verified" },
  { key: "documentsChecked",  label: "Documents Checked",     desc: "Sale deed, EC & key docs reviewed" },
  { key: "layoutApproved",    label: "Approved Layout",        desc: "HMDA / DTCP / BDA layout approved" },
  { key: "encumbranceClear",  label: "Encumbrance Clear",      desc: "No outstanding loans or legal claims" },
];

interface Props {
  flags: VerificationFlags;
  compact?: boolean;
  /** Use on dark card backgrounds (e.g. PropertyCard's dark theme) for readable contrast. */
  dark?: boolean;
  /** Where the "What this means" link goes — defaults to the general /verified explainer.
   *  Pass an in-page anchor (e.g. "#legal-shield") to link to this property's own
   *  Legal Safety Checklist section instead. */
  detailLinkHref?: string;
}

export default function VerificationBadge({ flags, compact = false, dark = false, detailLinkHref = "/verified" }: Props) {
  const trueChecks = CHECKS.filter(c => !!flags[c.key]);
  const anyVerified = trueChecks.length > 0 || flags.propknownVerified;

  if (compact) {
    if (!anyVerified) {
      return dark ? (
        <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 bg-black/60 border border-zinc-700 px-2 py-0.5 rounded-full">
          <Clock size={9} /> Verification in progress
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
          <Clock size={9} /> Verification in progress
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
        style={dark
          ? { background: "rgba(0,0,0,0.7)", border: "1px solid #C9A24B", color: "#e8c97a" }
          : { background: "rgba(201,162,75,0.1)", border: "1px solid rgba(201,162,75,0.4)", color: "#8a6a2e" }}
      >
        <Shield size={9} fill="#C9A24B" stroke={dark ? "#e8c97a" : "#8a6a2e"} />
        PropKnown Verified · {trueChecks.length} check{trueChecks.length !== 1 ? "s" : ""}
      </span>
    );
  }

  return (
    <div className="border border-gray-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-gray-900 font-bold text-sm">PropKnown Verification</h3>
        <Link
          href={detailLinkHref}
          className="text-[10px] flex items-center gap-1 hover:underline"
          style={{ color: "#8a6a2e" }}
        >
          What this means <ExternalLink size={9} />
        </Link>
      </div>

      {anyVerified ? (
        <div className="space-y-2.5">
          {CHECKS.map(({ key, label, desc }) => {
            const passed = !!flags[key];
            const extraLabel = key === "reraVerified" && flags.reraNumber ? ` — ${flags.reraNumber}` : "";
            const layoutLabel = key === "layoutApproved" && flags.layoutBadge ? ` (${flags.layoutBadge})` : "";
            return (
              <div key={key} className={`flex items-start gap-2.5 text-sm rounded-lg px-3 py-2 transition-colors ${passed ? "bg-green-50" : "bg-gray-50"}`}>
                {passed ? (
                  <CheckCircle size={15} className="text-green-500 shrink-0 mt-0.5" />
                ) : (
                  <Clock size={15} className="text-gray-300 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={`font-semibold text-xs ${passed ? "text-green-800" : "text-gray-400"}`}>
                    {label}{extraLabel}{layoutLabel}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${passed ? "text-green-600" : "text-gray-300"}`}>{desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex items-start gap-2.5 bg-gray-50 rounded-xl p-3">
          <Clock size={15} className="text-gray-300 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-gray-500">Verification in progress</p>
            <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
              Our team is conducting due diligence. Verified badges appear only once each check is complete.
            </p>
          </div>
        </div>
      )}

      <p className="text-[9px] text-gray-300 mt-3 leading-relaxed">
        Ticks shown only for completed checks. Verify independently before any transaction.
      </p>
    </div>
  );
}
