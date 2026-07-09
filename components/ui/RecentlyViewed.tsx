"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Clock, X } from "lucide-react";
import { getRecentlyViewed, clearRecentlyViewed, type RecentItem } from "@/lib/recentlyViewed";

export default function RecentlyViewed() {
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    setItems(getRecentlyViewed());
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-zinc-400 text-xs font-semibold uppercase tracking-widest">
          <Clock size={13} />
          Recently Viewed
        </div>
        <button
          onClick={() => { clearRecentlyViewed(); setItems([]); }}
          className="text-zinc-600 hover:text-zinc-400 transition-colors"
          title="Clear history">
          <X size={14} />
        </button>
      </div>
      <div className="space-y-2">
        {items.slice(0, 5).map(item => (
          <Link
            key={item.id}
            href={`/buy/${item.id}`}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-800 transition-colors group">
            {item.image ? (
              <Image src={item.image} alt={`${item.title}, ${item.city}`} width={40} height={40} className="w-10 h-10 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-zinc-700 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-white text-xs font-medium truncate group-hover:text-yellow-400 transition-colors">{item.title}</p>
              <p className="text-zinc-500 text-[10px] truncate">{item.city} · {item.price}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
