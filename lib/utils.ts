import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number, currency = "INR"): string {
  const formatters: Record<string, Intl.NumberFormat> = {
    INR: new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }),
    USD: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }),
    AED: new Intl.NumberFormat("ar-AE", { style: "currency", currency: "AED", maximumFractionDigits: 0 }),
    GBP: new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }),
    SGD: new Intl.NumberFormat("en-SG", { style: "currency", currency: "SGD", maximumFractionDigits: 0 }),
  };
  const fmt = formatters[currency] ?? formatters.INR;
  if (currency === "INR") {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000)   return `₹${(price / 100000).toFixed(2)} L`;
  }
  return fmt.format(price);
}

// Relative freshness signal ("Posted 3 days ago") for listings with a genuine timestamp.
// Deliberately not used on the static demo listings in lib/listings.ts, which have no real
// per-listing post date -- fabricating one would be a false freshness claim, not a fix.
export function formatPostedDate(createdAt: string | Date): string {
  const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const days = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Posted today";
  if (days === 1) return "Posted 1 day ago";
  if (days < 30) return `Posted ${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Posted ${months} month${months > 1 ? "s" : ""} ago`;
  const years = Math.floor(months / 12);
  return `Posted ${years} year${years > 1 ? "s" : ""} ago`;
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const COMPANY = {
  name:    "PROPKNOWN INFRA PVT LTD",
  tagline: "KNOW. INVEST. GROW.",
  phone:   "+91 70130 16003",
  phoneTel:"+917013016003",
  whatsapp:"917013016003",
  email:   "kiranpropservices@gmail.com",
  address: "Shop No 3, Venkateswara Nilayam, Opposite Vertex Prime, Nizampet Road, Hyderabad 500090",
  founder: "Pinnelli Raghu Kiran",
  markets: ["India", "USA", "UAE", "UK", "Singapore"],
};
