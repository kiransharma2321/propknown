"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface Buyer { id: string; name: string; email: string }

interface FavoriteItem {
  listingId: string;
  title: string;
  priceDisplay?: string;
  location?: string;
  image?: string;
}

interface BuyerCtx {
  buyer: Buyer | null;
  loading: boolean;
  favoriteIds: Set<string>;
  toggleFavorite: (item: FavoriteItem) => Promise<boolean>; // false = not logged in
  refreshBuyer: () => void;
}

const BuyerContext = createContext<BuyerCtx>({
  buyer: null,
  loading: true,
  favoriteIds: new Set(),
  toggleFavorite: async () => false,
  refreshBuyer: () => {},
});

export function BuyerProvider({ children }: { children: ReactNode }) {
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const meRes = await fetch("/api/buyer/me");
      const me = await meRes.json();
      setBuyer(me.buyer ?? null);

      if (me.buyer) {
        const favRes = await fetch("/api/buyer/favorites");
        if (favRes.ok) {
          const { favorites } = await favRes.json();
          setFavoriteIds(new Set(favorites.map((f: { listingId: string }) => f.listingId)));
        }
      } else {
        setFavoriteIds(new Set());
      }
    } catch {
      setBuyer(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleFavorite = useCallback(async (item: FavoriteItem): Promise<boolean> => {
    if (!buyer) return false;

    const isFav = favoriteIds.has(item.listingId);
    setFavoriteIds(prev => {
      const next = new Set(prev);
      if (isFav) next.delete(item.listingId); else next.add(item.listingId);
      return next;
    });

    try {
      if (isFav) {
        await fetch("/api/buyer/favorites", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId: item.listingId }),
        });
      } else {
        await fetch("/api/buyer/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
      }
    } catch {
      // Revert optimistic update on failure
      setFavoriteIds(prev => {
        const next = new Set(prev);
        if (isFav) next.add(item.listingId); else next.delete(item.listingId);
        return next;
      });
    }
    return true;
  }, [buyer, favoriteIds]);

  return (
    <BuyerContext.Provider value={{ buyer, loading, favoriteIds, toggleFavorite, refreshBuyer: load }}>
      {children}
    </BuyerContext.Provider>
  );
}

export function useBuyer() { return useContext(BuyerContext); }
