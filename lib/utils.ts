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

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const ADMIN_CREDENTIALS = { username: "propknown", password: "***REMOVED***" };
export const CRM_CREDENTIALS   = { username: "crm",       password: "***REMOVED***" };

export const COMPANY = {
  name:    "PROPKNOWN INFRA PVT LTD",
  tagline: "KNOW. INVEST. GROW.",
  phone:   "+91 97017 71333",
  whatsapp:"919701771333",
  email:   "kiranpropservices@gmail.com",
  address: "Shop No 3, Venkateswara Nilyam, Opposite Vertex Prime, Nizampet Road, Hyderabad 500090",
  founder: "Pinnelli Raghu Kiran",
  markets: ["India", "USA", "UAE", "UK", "Singapore"],
};
