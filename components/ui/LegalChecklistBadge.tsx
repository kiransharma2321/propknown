"use client";

import { useState } from "react";
import { CheckCircle, Clock, MinusCircle, Info, Shield } from "lucide-react";
import { LEGAL_CHECKLIST_ITEMS, checklistSummary, type LegalChecklist } from "@/lib/legalShield";

interface Props {
  checklist: LegalChecklist;
  notes?: string | null;
  id?: string;
}

const STATUS_STYLE: Record<string, { icon: typeof CheckCircle; color: string; bg: string; label: string }> = {
  verified: { icon: CheckCircle,  color: "#16a34a", bg: "bg-green-50", label: "Verified" },
  pending:  { icon: Clock,        color: "#9ca3af", bg: "bg-gray-50",  label: "Pending" },
  na:       { icon: MinusCircle,  color: "#9ca3af", bg: "bg-gray-50",  label: "Not Applicable" },
};

export default function LegalChecklistBadge({ checklist, notes, id }: Props) {
  const [openTip, setOpenTip] = useState<string | null>(null);
  const { verified, total } = checklistSummary(checklist);

  return (
    <div id={id} className="border border-gray-200 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <Shield size={16} style={{ color: "#C9A24B" }} />
        <h3 className="text-gray-900 font-bold text-sm">Legal Safety Checklist</h3>
      </div>
      <p className="text-gray-400 text-xs mb-4">
        {verified} of {total} checks independently verified by PropKnown.
      </p>

      <div className="space-y-2">
        {LEGAL_CHECKLIST_ITEMS.map((item) => {
          const status = checklist[item.key] ?? "pending";
          const s = STATUS_STYLE[status] ?? STATUS_STYLE.pending;
          const Icon = s.icon;
          return (
            <div key={item.key} className={`flex items-start gap-2.5 text-sm rounded-lg px-3 py-2 ${status === "verified" ? s.bg : "bg-gray-50"}`}>
              <Icon size={15} style={{ color: s.color }} className="shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className={`font-semibold text-xs ${status === "verified" ? "text-green-800" : "text-gray-500"}`}>
                    {item.label}
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpenTip(openTip === item.key ? null : item.key)}
                    aria-label={`Why ${item.label} matters`}
                    className="text-gray-300 hover:text-gray-500 transition-colors shrink-0"
                  >
                    <Info size={11} />
                  </button>
                  <span className="text-[9px] text-gray-400 ml-auto shrink-0">{s.label}</span>
                </div>
                {openTip === item.key && (
                  <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{item.why}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {notes && (
        <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-[11px] text-yellow-800 leading-relaxed">
            <span className="font-semibold">PropKnown note: </span>{notes}
          </p>
        </div>
      )}

      <p className="text-[9px] text-gray-300 mt-3 leading-relaxed">
        Checks reflect PropKnown&apos;s own due diligence at the time of listing/review — always verify independently before any transaction.
      </p>
    </div>
  );
}
