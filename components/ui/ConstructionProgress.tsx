import { HardHat, Calendar, Clock } from "lucide-react";
import { sortMilestones, lastUpdatedDate, type ConstructionMilestone } from "@/lib/constructionProgress";

interface Props {
  milestones: ConstructionMilestone[];
  pctComplete?: number | null;
  expectedCompletion?: string | null;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export default function ConstructionProgress({ milestones, pctComplete, expectedCompletion }: Props) {
  if (!milestones || milestones.length === 0) return null;

  const sorted = sortMilestones(milestones);
  const lastUpdated = lastUpdatedDate(milestones);
  const pct = pctComplete != null ? Math.max(0, Math.min(100, pctComplete)) : null;

  return (
    <div className="border border-gray-200 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <HardHat size={18} style={{ color: "#C9A24B" }} />
          <h3 className="text-gray-900 font-bold text-base">Construction Progress</h3>
        </div>
        {lastUpdated && (
          <span className="flex items-center gap-1 text-[10px] text-gray-400">
            <Clock size={10} /> Last updated {fmtDate(lastUpdated)}
          </span>
        )}
      </div>

      {pct != null && (
        <div className="mb-5">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
            <span>Overall progress</span>
            <span className="font-bold" style={{ color: "#C9A24B" }}>{pct}% complete</span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "#C9A24B" }} />
          </div>
        </div>
      )}

      {expectedCompletion && (
        <p className="flex items-center gap-1.5 text-xs text-gray-500 mb-5">
          <Calendar size={12} /> Expected completion: <span className="font-semibold text-gray-700">{fmtDate(expectedCompletion)}</span>
        </p>
      )}

      <div className="space-y-4">
        {sorted.map((m, i) => (
          <div key={m.id} className="flex gap-3">
            <div className="flex flex-col items-center shrink-0">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#C9A24B" }} />
              {i < sorted.length - 1 && <span className="w-px flex-1 bg-gray-200 mt-1" />}
            </div>
            <div className="pb-4 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-gray-900 text-sm">{m.title}</p>
                <span className="text-[10px] text-gray-400">{fmtDate(m.date)}</span>
              </div>
              {m.note && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{m.note}</p>}
              {m.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.photoUrl} alt={m.title} className="mt-2 w-full max-w-xs rounded-lg border border-gray-200 object-cover" style={{ maxHeight: 200 }} />
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[9px] text-gray-300 mt-4 leading-relaxed">
        Progress updates are provided by the developer/owner and reviewed by PropKnown — always confirm current status during a site visit before making payment decisions.
      </p>
    </div>
  );
}
