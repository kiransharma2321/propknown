"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export interface CompareItem {
  id: string;
  title: string;
  price: number;
  priceDisplay: string;
  sqft?: number;
  beds?: number;
  baths?: number;
  location: string;
  city: string;
  type: string;
  image?: string;
  aiScore?: number;
  reraNumber?: string;
  status?: string;
  badge?: string;
  currency?: string;
  source: "curated" | "submission";
}

interface ComparisonContextType {
  items: CompareItem[];
  add: (item: CompareItem) => void;
  remove: (id: string) => void;
  clear: () => void;
  isAdded: (id: string) => boolean;
}

const ComparisonContext = createContext<ComparisonContextType>({
  items: [],
  add: () => {},
  remove: () => {},
  clear: () => {},
  isAdded: () => false,
});

export function ComparisonProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CompareItem[]>([]);

  const isAdded = (id: string) => items.some(i => i.id === id);

  const add = (item: CompareItem) => {
    if (items.length >= 4 || isAdded(item.id)) return;
    setItems(prev => [...prev, item]);
  };

  const remove = (id: string) =>
    setItems(prev => prev.filter(i => i.id !== id));

  const clear = () => setItems([]);

  return (
    <ComparisonContext.Provider value={{ items, add, remove, clear, isAdded }}>
      {children}
    </ComparisonContext.Provider>
  );
}

export function useComparison() {
  return useContext(ComparisonContext);
}
