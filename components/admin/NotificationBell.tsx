"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellDot, Check, ExternalLink, X } from "lucide-react";
import Link from "next/link";

interface Notif {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

const TYPE_COLOR: Record<string, string> = {
  new_submission: "bg-blue-500",
  approved: "bg-green-500",
  rejected: "bg-red-500",
  new_lead: "bg-yellow-500",
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const r = await fetch("/api/notifications");
      const d = await r.json() as { notifications: Notif[]; unreadCount: number };
      setNotifications(d.notifications ?? []);
      setUnread(d.unreadCount ?? 0);
    } catch { /* noop */ }
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markAllRead: true }) });
    setNotifications(n => n.map(x => ({ ...x, isRead: true })));
    setUnread(0);
  };

  const markRead = async (id: string) => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [id] }) });
    setNotifications(n => n.map(x => x.id === id ? { ...x, isRead: true } : x));
    setUnread(u => Math.max(0, u - 1));
  };

  const timeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all">
        {unread > 0 ? <BellDot size={18} className="text-yellow-400" /> : <Bell size={18} />}
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full text-[10px] font-bold flex items-center justify-center bg-yellow-400 text-black">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <span className="text-white text-sm font-semibold">Notifications {unread > 0 && <span className="text-yellow-400">({unread})</span>}</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-zinc-400 hover:text-white transition-colors" title="Mark all read">
                  <Check size={14} />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-white transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-zinc-500 text-sm">No notifications</div>
            ) : (
              notifications.slice(0, 20).map(n => (
                <div
                  key={n.id}
                  onClick={() => { if (!n.isRead) markRead(n.id); }}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-zinc-800 hover:bg-zinc-800 transition-colors cursor-pointer ${!n.isRead ? "bg-zinc-800/50" : ""}`}>
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${TYPE_COLOR[n.type] ?? "bg-zinc-500"}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs leading-tight mb-0.5 ${n.isRead ? "text-zinc-400" : "text-white font-medium"}`}>{n.title}</p>
                    {n.body && <p className="text-zinc-500 text-[10px] leading-tight truncate">{n.body}</p>}
                    <p className="text-zinc-600 text-[10px] mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                  {n.link && (
                    <Link href={n.link} className="text-zinc-500 hover:text-yellow-400 shrink-0 mt-0.5" onClick={e => e.stopPropagation()}>
                      <ExternalLink size={12} />
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-zinc-800">
              <Link href="/admin/dashboard" className="text-xs text-zinc-400 hover:text-yellow-400 transition-colors" onClick={() => setOpen(false)}>
                View all in dashboard
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
