"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, TrendingUp, Trophy, IndianRupee } from "lucide-react";
import Link from "next/link";

interface Lead {
  id: string;
  name: string;
  phone: string;
  status: string;
  leadValue?: number;
  followUpDate?: string;
  source: string;
  property?: { id: string; title: string } | null;
  createdAt: string;
}

const STAGES = [
  { key: "new",          label: "New",          color: "text-blue-400" },
  { key: "contacted",    label: "Contacted",    color: "text-yellow-400" },
  { key: "visit_booked", label: "Visit",        color: "text-purple-400" },
  { key: "negotiation",  label: "Negotiation",  color: "text-orange-400" },
  { key: "won",          label: "Won",          color: "text-green-400" },
  { key: "lost",         label: "Lost",         color: "text-red-400" },
];

export default function DealsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leads")
      .then(r => r.json())
      .then(d => setLeads(Array.isArray(d) ? d : []))
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  }, []);

  const byStage = (stage: string) => leads.filter(l => l.status === stage);
  const stageValue = (stage: string) => byStage(stage).reduce((s, l) => s + (l.leadValue ?? 0), 0);

  const totalPipeline = leads.filter(l => l.status !== "lost").reduce((s, l) => s + (l.leadValue ?? 0), 0);
  const wonValue      = leads.filter(l => l.status === "won").reduce((s, l) => s + (l.leadValue ?? 0), 0);
  const winRate       = leads.length > 0 ? Math.round((byStage("won").length / leads.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-navy p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/crm/dashboard" className="text-zinc-400 hover:text-white"><ArrowLeft size={18} /></Link>
          <div>
            <h1 className="font-playfair text-white text-xl font-bold">Deals Dashboard</h1>
            <p className="text-zinc-500 text-sm">Pipeline overview and conversion analytics</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Pipeline", value: `₹${(totalPipeline / 1e5).toFixed(1)}L`, icon: <TrendingUp size={16} />, color: "text-[#D6A63E]" },
            { label: "Won Value",      value: `₹${(wonValue / 1e5).toFixed(1)}L`,      icon: <Trophy size={16} />,     color: "text-green-400" },
            { label: "Total Deals",    value: String(leads.length),                      icon: <IndianRupee size={16} />, color: "text-blue-400" },
            { label: "Win Rate",       value: `${winRate}%`,                             icon: <Trophy size={16} />,     color: "text-purple-400" },
          ].map(k => (
            <div key={k.label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className={`${k.color} mb-2`}>{k.icon}</div>
              <p className="text-white text-2xl font-bold">{k.value}</p>
              <p className="text-zinc-500 text-xs mt-1">{k.label}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-zinc-500">Loading deals...</div>
        ) : (
          <div className="grid gap-4">
            {STAGES.map(stage => {
              const deals = byStage(stage.key);
              const val   = stageValue(stage.key);
              return (
                <div key={stage.key} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${stage.color}`}>{stage.label}</span>
                      <span className="bg-white/10 text-zinc-400 text-xs px-2 py-0.5 rounded-full">{deals.length}</span>
                    </div>
                    {val > 0 && <span className="text-xs text-zinc-400">₹{(val / 1e5).toFixed(1)}L</span>}
                  </div>

                  {deals.length === 0 ? (
                    <p className="text-zinc-700 text-xs">No deals in this stage</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {deals.map(d => (
                        <div key={d.id} className="bg-white/10 rounded-xl px-3 py-2 flex items-center gap-3 min-w-[200px]">
                          <div>
                            <p className="text-white text-xs font-medium">{d.name}</p>
                            <p className="text-zinc-500 text-[10px]">{d.property?.title ?? d.source}</p>
                          </div>
                          {d.leadValue && d.leadValue > 0 && (
                            <span className="text-green-400 text-[10px] ml-auto shrink-0">₹{(d.leadValue / 1e5).toFixed(1)}L</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
