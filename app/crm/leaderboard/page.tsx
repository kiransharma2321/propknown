"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trophy, Medal, Award, TrendingUp } from "lucide-react";
import PKLogo from "@/components/layout/PKLogo";

interface RepStats { name: string; dealsWon: number; totalLeads: number; totalValue: number; conversionRate: number }

// Sales Champions Leaderboard (new feature). Real data only -- ranked by actual won deals from
// the Lead table (same source the Executive Dashboard uses), never fabricated. Viewable by any
// logged-in CRM user by design: gating this to managers/admins only would defeat the point of
// team recognition/motivation -- salespeople need to actually see it for it to work as intended.
export default function LeaderboardPage() {
  const [enoughData, setEnoughData] = useState(true);
  const [repCount, setRepCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState<RepStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/crm/leaderboard").then(r => r.ok ? r.json() : null).then((d: { enoughData: boolean; repCount: number; leaderboard: RepStats[] } | null) => {
      if (d) { setEnoughData(d.enoughData); setRepCount(d.repCount); setLeaderboard(d.leaderboard); }
      setLoading(false);
    });
  }, []);

  const [first, second, third] = leaderboard;

  const PODIUM_STYLE = [
    { icon: <Trophy size={22} />, color: "var(--gold)", label: "#1", height: "h-28" },
    { icon: <Medal size={20} />, color: "#B0B0B0", label: "#2", height: "h-20" },
    { icon: <Award size={18} />, color: "#C68642", label: "#3", height: "h-14" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/crm/dashboard" className="text-gray-400 hover:text-gray-900"><ArrowLeft size={18} /></Link>
          <PKLogo />
        </div>
        <h1 className="heading-h3 mb-1 flex items-center gap-2"><Trophy size={20} style={{ color: "var(--gold-text)" }} /> Sales Champions</h1>
        <p className="text-gray-500 text-sm mb-6">Ranked by real deals won — updates automatically as leads close.</p>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading…</p>
        ) : !enoughData ? (
          <div className="card-dark p-8 text-center">
            <TrendingUp size={28} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-700 text-sm font-semibold mb-1">Not enough data yet to rank anyone meaningfully</p>
            <p className="text-gray-500 text-xs">
              {repCount === 0
                ? "No leads have been assigned to a sales executive yet."
                : `Only ${repCount} rep${repCount === 1 ? " has" : "s have"} assigned leads so far — at least 2 are needed for a real comparison.`}
              {" "}Assign leads to reps in the Lead Pipeline and this will populate honestly as deals close.
            </p>
          </div>
        ) : (
          <>
            {/* Podium — top 3 */}
            <div className="flex items-end justify-center gap-4 mb-8 pt-6">
              {[second, first, third].map((rep, visualIdx) => {
                if (!rep) return <div key={visualIdx} className="w-24" />;
                const rank = visualIdx === 1 ? 0 : visualIdx === 0 ? 1 : 2; // map visual center/left/right back to #1/#2/#3
                const style = PODIUM_STYLE[rank];
                return (
                  <div key={rep.name} className="flex flex-col items-center w-24">
                    <div style={{ color: style.color }} className="mb-1">{style.icon}</div>
                    <p className="text-gray-900 text-xs font-bold text-center truncate w-full">{rep.name}</p>
                    <p className="text-gray-500 text-[10px] mb-2">{rep.dealsWon} won</p>
                    <div className={`w-full ${style.height} rounded-t-lg flex items-start justify-center pt-2`} style={{ background: rank === 0 ? "var(--gold)" : rank === 1 ? "#E5E5E5" : "#EAD5C0" }}>
                      <span className="font-playfair font-bold text-lg" style={{ color: rank === 0 ? "var(--navy)" : "#555" }}>{style.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Full ranked list */}
            <div className="card-dark overflow-hidden">
              {leaderboard.map((rep, i) => (
                <div key={rep.name} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0">
                  <span className={`text-sm font-bold w-6 ${i < 3 ? "" : "text-gray-400"}`} style={i < 3 ? { color: "var(--gold-text)" } : undefined}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 text-sm font-medium">{rep.name}</p>
                    <p className="text-gray-500 text-xs">{rep.totalLeads} leads · {rep.conversionRate}% conversion</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-gray-900 text-sm font-semibold">{rep.dealsWon} won</p>
                    {rep.totalValue > 0 && <p className="text-green-600 text-xs">₹{(rep.totalValue / 1e5).toFixed(1)}L</p>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
