"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, GraduationCap, Video, FileText, Link as LinkIcon, CheckCircle2, Circle } from "lucide-react";
import PKLogo from "@/components/layout/PKLogo";
import { useToast } from "@/components/ui/Toast";

interface TrainingItem { id: string; title: string; description: string | null; link: string; linkType: string }
interface Assignment { id: string; completed: boolean; completedAt: string | null; assignedAt: string; trainingItem: TrainingItem }

const LINK_ICON: Record<string, React.ReactNode> = { video: <Video size={14} />, document: <FileText size={14} />, other: <LinkIcon size={14} /> };

// Employee-facing Training Tracker view -- each logged-in CRM user sees only their own
// assigned items and can mark them complete themselves (an admin can't mark it for them,
// so completion genuinely reflects the employee's own action).
export default function MyTrainingPage() {
  const toast = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const r = await fetch("/api/crm/training/my-assignments");
    if (r.ok) setAssignments((await r.json() as { assignments: Assignment[] }).assignments);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const markComplete = async (id: string) => {
    const r = await fetch(`/api/crm/training/${id}/complete`, { method: "PATCH" });
    if (r.ok) { toast("Marked as completed"); await load(); }
    else toast("Failed to update", "error");
  };

  const pending = assignments.filter(a => !a.completed);
  const done = assignments.filter(a => a.completed);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/crm/dashboard" className="text-gray-400 hover:text-gray-900"><ArrowLeft size={18} /></Link>
          <PKLogo />
        </div>
        <h1 className="heading-h3 mb-1 flex items-center gap-2"><GraduationCap size={20} style={{ color: "var(--gold-text)" }} /> My Training</h1>
        <p className="text-gray-500 text-sm mb-6">Training items assigned to you. Mark each complete once you&apos;ve gone through it.</p>

        {loading ? <p className="text-gray-500 text-sm">Loading…</p> : assignments.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-10">No training assigned to you yet.</p>
        ) : (
          <>
            {pending.length > 0 && (
              <div className="mb-6">
                <h2 className="text-gray-700 text-xs font-semibold uppercase tracking-wider mb-2">Pending ({pending.length})</h2>
                <div className="space-y-2">
                  {pending.map(a => (
                    <div key={a.id} className="card-dark p-4 flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        <span className="text-gray-400 mt-0.5">{LINK_ICON[a.trainingItem.linkType] ?? LINK_ICON.other}</span>
                        <div>
                          <p className="text-gray-900 text-sm font-semibold">{a.trainingItem.title}</p>
                          {a.trainingItem.description && <p className="text-gray-500 text-xs mt-0.5">{a.trainingItem.description}</p>}
                          <a href={a.trainingItem.link} target="_blank" rel="noopener noreferrer" className="nav-link text-xs mt-1 inline-block">Open resource →</a>
                        </div>
                      </div>
                      <button onClick={() => markComplete(a.id)} className="btn-secondary text-xs px-3 py-1.5 shrink-0 flex items-center gap-1.5">
                        <Circle size={12} /> Mark Completed
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {done.length > 0 && (
              <div>
                <h2 className="text-gray-700 text-xs font-semibold uppercase tracking-wider mb-2">Completed ({done.length})</h2>
                <div className="space-y-2">
                  {done.map(a => (
                    <div key={a.id} className="card-dark p-4 flex items-center gap-2 opacity-70">
                      <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                      <p className="text-gray-700 text-sm">{a.trainingItem.title}</p>
                      <span className="text-gray-400 text-xs ml-auto">{a.completedAt ? new Date(a.completedAt).toLocaleDateString("en-IN") : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
