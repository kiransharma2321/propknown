"use client";

const KEY = "pk_recently_viewed";
const MAX = 10;

export interface RecentItem {
  id: string;
  title: string;
  price: string;
  city: string;
  type: string;
  image?: string;
  viewedAt: number;
}

function parseCookie(): RecentItem[] {
  try {
    const raw = document.cookie
      .split("; ")
      .find(r => r.startsWith(KEY + "="))
      ?.split("=")
      .slice(1)
      .join("=");
    if (!raw) return [];
    return JSON.parse(decodeURIComponent(raw)) as RecentItem[];
  } catch { return []; }
}

function writeCookie(items: RecentItem[]) {
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${KEY}=${encodeURIComponent(JSON.stringify(items))}; expires=${expires}; path=/; SameSite=Lax`;
}

export function addRecentlyViewed(item: Omit<RecentItem, "viewedAt">) {
  const existing = parseCookie().filter(i => i.id !== item.id);
  const updated = [{ ...item, viewedAt: Date.now() }, ...existing].slice(0, MAX);
  writeCookie(updated);
}

export function getRecentlyViewed(): RecentItem[] {
  return parseCookie().sort((a, b) => b.viewedAt - a.viewedAt);
}

export function clearRecentlyViewed() {
  document.cookie = `${KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}
