import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Contact PropKnown — WhatsApp Raghu on 97017 71333 for instant property advice. Visit us at Shop No 3, Venkateswara Nilayam, Nizampet Road, Hyderabad 500090. Email: kiranpropservices@gmail.com. We respond within 2 hours.",
  openGraph: {
    title: "Contact PropKnown — WhatsApp 97017 71333",
    description:
      "Reach Raghu Kiran directly on WhatsApp 97017 71333 or visit our Hyderabad office. We respond within 2 hours.",
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
