"use client";

import { useEffect, useState } from "react";
import { Search, Phone, Mail, MessageSquare, User, ArrowLeft, TrendingUp } from "lucide-react";
import Link from "next/link";

interface Lead {
  id: string;
  name: string;
  email?: string;
  phone: string;
  source: string;
  status: string;
  leadValue?: number;
  createdAt: string;
  property?: { id: string; title: string } | null;
}

const SOURCE_LABELS: Record<string, string> = {
  "homepage-cta": "Homepage", contact: "Contact", buy: "Buy Page",
  "ai-intelligence": "AI Tool", chatbot: "KnownAI", manual: "Manual",
  webhook: "Webhook", "meta-ads": "Meta", "google-ads": "Google",
};

export default function ContactsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/leads")
      .then(r => r.json())
      .then(d => setLeads(Array.isArray(d) ? d : []))
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = leads.filter(l => {
    const q = search.toLowerCase();
    return !q || l.name.toLowerCase().includes(q) || l.phone.includes(q) || (l.email ?? "").toLowerCase().includes(q);
  });

  const totalValue = leads.reduce((s, l) => s + (l.leadValue ?? 0), 0);

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/crm/dashboard" className="text-zinc-400 hover:text-white"><ArrowLeft size={18} /></Link>
            <div>
              <h1 className="text-white text-xl font-bold">Contacts</h1>
              <p className="text-zinc-500 text-sm">{leads.length} contacts · Pipeline: ₹{(totalValue / 1e5).toFixed(1)}L</p>
            </div>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, phone, email..."
              className="bg-zinc-900 border border-zinc-700 text-white text-xs rounded-xl pl-8 pr-3 py-2 w-64 focus:outline-none focus:border-yellow-600 placeholder-zinc-600" />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-zinc-500">Loading contacts...</div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-xs">
                  <th className="text-left py-3 px-4">Contact</th>
                  <th className="text-left py-3 px-4">Source</th>
                  <th className="text-left py-3 px-4">Property Interest</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Value</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(lead => (
                  <tr key={lead.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
                          <User size={14} className="text-zinc-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{lead.name}</p>
                          <p className="text-zinc-500 text-xs">{lead.email ?? lead.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-zinc-400 text-xs">{SOURCE_LABELS[lead.source] ?? lead.source}</td>
                    <td className="py-3 px-4 text-zinc-500 text-xs">{lead.property?.title ?? "—"}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        lead.status === "won" ? "bg-green-900 text-green-400"
                          : lead.status === "lost" ? "bg-red-900 text-red-400"
                          : "bg-zinc-800 text-zinc-400"
                      }`}>{lead.status}</span>
                    </td>
                    <td className="py-3 px-4 text-green-400 text-xs">
                      {lead.leadValue ? `₹${(lead.leadValue / 1e5).toFixed(1)}L` : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <a href={`tel:${lead.phone}`} className="text-zinc-500 hover:text-white transition-colors" title="Call"><Phone size={14} /></a>
                        {lead.email && <a href={`mailto:${lead.email}`} className="text-zinc-500 hover:text-white transition-colors" title="Email"><Mail size={14} /></a>}
                        <a href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-green-400 transition-colors" title="WhatsApp"><MessageSquare size={14} /></a>
                        <Link href={`/crm/dashboard`} className="text-zinc-500 hover:text-yellow-400 transition-colors" title="Open in pipeline"><TrendingUp size={14} /></Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-10 text-zinc-600 text-sm">No contacts match your search</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
