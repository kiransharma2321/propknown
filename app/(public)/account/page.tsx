"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, Bell, LogOut, Trash2 } from "lucide-react";
import { useBuyer } from "@/components/buyer/BuyerProvider";

// #8a6a2e (5.02:1 on white) instead of #C9A24B (2.40:1) -- WCAG AA needs 4.5:1 for text.
const GOLD = "#8a6a2e";
const CITIES = ["Any City", "Hyderabad", "Bangalore", "Mumbai", "Pune", "Chennai", "Delhi NCR", "Dubai"];
const TYPES  = ["Any Type", "Apartment", "Villa", "House", "Commercial", "Plot", "Farm Land"];

interface Favorite { id: string; listingId: string; title: string; priceDisplay?: string; location?: string; image?: string }
interface Alert { id: string; city?: string; propType?: string; minBudget?: number; maxBudget?: number; createdAt: string }

export default function AccountDashboardPage() {
  const router = useRouter();
  const { buyer, loading: buyerLoading, refreshBuyer } = useBuyer();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [newAlert, setNewAlert] = useState({ city: "Any City", propType: "Any Type", minBudget: "", maxBudget: "" });

  useEffect(() => {
    if (buyerLoading) return;
    if (!buyer) { router.push("/account/login?next=/account"); return; }

    Promise.all([
      fetch("/api/buyer/favorites").then(r => r.json()),
      fetch("/api/buyer/alerts").then(r => r.json()),
    ]).then(([favData, alertData]) => {
      setFavorites(favData.favorites ?? []);
      setAlerts(alertData.alerts ?? []);
      setLoadingData(false);
    });
  }, [buyer, buyerLoading, router]);

  const removeFavorite = async (listingId: string) => {
    setFavorites(f => f.filter(x => x.listingId !== listingId));
    await fetch("/api/buyer/favorites", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    });
  };

  const addAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/buyer/alerts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        city: newAlert.city === "Any City" ? undefined : newAlert.city,
        propType: newAlert.propType === "Any Type" ? undefined : newAlert.propType,
        minBudget: newAlert.minBudget ? parseFloat(newAlert.minBudget) * 1e5 : undefined,
        maxBudget: newAlert.maxBudget ? parseFloat(newAlert.maxBudget) * 1e5 : undefined,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setAlerts(a => [data.alert, ...a]);
      setNewAlert({ city: "Any City", propType: "Any Type", minBudget: "", maxBudget: "" });
    }
  };

  const removeAlert = async (id: string) => {
    setAlerts(a => a.filter(x => x.id !== id));
    await fetch("/api/buyer/alerts", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  };

  const logout = async () => {
    await fetch("/api/buyer/logout", { method: "POST" });
    refreshBuyer();
    router.push("/");
  };

  if (buyerLoading || !buyer || loadingData) {
    return <div className="pt-32 pb-20 min-h-screen bg-white" />;
  }

  return (
    <div className="pt-32 pb-20 bg-white min-h-screen">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "var(--font-playfair,Georgia,serif)" }}>
              Welcome, {buyer.name}
            </h1>
            <p className="text-gray-500 text-sm mt-1">{buyer.email}</p>
          </div>
          <button onClick={logout} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <LogOut size={14} /> Log out
          </button>
        </div>

        {/* Favorites */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Heart size={16} style={{ color: GOLD }} />
            <h2 className="text-lg font-bold text-gray-900">Saved Favorites ({favorites.length})</h2>
          </div>
          {favorites.length === 0 ? (
            <p className="text-gray-400 text-sm">
              No favorites yet. <Link href="/buy" className="underline" style={{ color: GOLD }}>Browse properties</Link> and tap the heart icon to save one.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {favorites.map(f => (
                <div key={f.id} className="flex gap-3 border border-gray-200 rounded-xl p-3">
                  {f.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.image} alt={f.title} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-gray-900 line-clamp-1">{f.title}</p>
                    <p className="text-xs text-gray-400 line-clamp-1">{f.location}</p>
                    {f.priceDisplay && <p className="text-sm font-bold mt-0.5" style={{ color: GOLD }}>{f.priceDisplay}</p>}
                  </div>
                  <button onClick={() => removeFavorite(f.listingId)} className="text-gray-300 hover:text-red-500 transition-colors shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Alerts */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} style={{ color: GOLD }} />
            <h2 className="text-lg font-bold text-gray-900">Property Alerts ({alerts.length})</h2>
          </div>
          <p className="text-gray-500 text-xs mb-4">Get emailed the moment a matching property goes live.</p>

          <form onSubmit={addAlert} className="flex flex-wrap gap-2 mb-6">
            <select value={newAlert.city} onChange={e => setNewAlert(a => ({ ...a, city: e.target.value }))}
              className="border border-gray-300 text-gray-900 text-sm rounded-lg py-2 px-3">
              {CITIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={newAlert.propType} onChange={e => setNewAlert(a => ({ ...a, propType: e.target.value }))}
              className="border border-gray-300 text-gray-900 text-sm rounded-lg py-2 px-3">
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <input placeholder="Min ₹L" type="number" value={newAlert.minBudget}
              onChange={e => setNewAlert(a => ({ ...a, minBudget: e.target.value }))}
              className="w-24 border border-gray-300 text-gray-900 text-sm rounded-lg py-2 px-3" />
            <input placeholder="Max ₹L" type="number" value={newAlert.maxBudget}
              onChange={e => setNewAlert(a => ({ ...a, maxBudget: e.target.value }))}
              className="w-24 border border-gray-300 text-gray-900 text-sm rounded-lg py-2 px-3" />
            <button type="submit" className="px-4 py-2 rounded-lg font-semibold text-sm text-black" style={{ background: "#C9A24B" }}>
              Save Alert
            </button>
          </form>

          {alerts.length === 0 ? (
            <p className="text-gray-400 text-sm">No alerts yet — set one up above.</p>
          ) : (
            <div className="space-y-2">
              {alerts.map(a => (
                <div key={a.id} className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-2.5">
                  <p className="text-sm text-gray-700">
                    {a.city ?? "Any city"} · {a.propType ?? "Any type"}
                    {(a.minBudget || a.maxBudget) && (
                      <> · ₹{a.minBudget ? (a.minBudget / 1e5).toFixed(0) : "0"}L–{a.maxBudget ? (a.maxBudget / 1e5).toFixed(0) + "L" : "∞"}</>
                    )}
                  </p>
                  <button onClick={() => removeAlert(a.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
