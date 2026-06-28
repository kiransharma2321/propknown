"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import PropertyCard from "@/components/ui/PropertyCard";

const SAMPLE_PROPERTIES = [
  {
    id: "prop-1",
    title: "Luxury 3BHK Apartment — Gachibowli, Hyderabad",
    location: "Gachibowli",
    city: "Hyderabad",
    price: 9500000,
    currency: "INR",
    beds: 3, baths: 3, sqft: 1850,
    propertyType: "apartment", listingType: "sale",
    images: ["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80"],
    aiScore: 8.7, reraNumber: "P02400001234", featured: true, verified: true,
  },
  {
    id: "prop-2",
    title: "Premium Villa — Financial District, Hyderabad",
    location: "Financial District",
    city: "Hyderabad",
    price: 28000000,
    currency: "INR",
    beds: 5, baths: 5, sqft: 5200,
    propertyType: "villa", listingType: "sale",
    images: ["https://images.unsplash.com/photo-1613977257363-707ba9348227?w=600&q=80"],
    aiScore: 9.2, reraNumber: "P02400005678", featured: true, verified: true,
  },
  {
    id: "prop-3",
    title: "Modern 2BHK — Whitefield, Bangalore",
    location: "Whitefield",
    city: "Bangalore",
    price: 8200000,
    currency: "INR",
    beds: 2, baths: 2, sqft: 1200,
    propertyType: "apartment", listingType: "sale",
    images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80"],
    aiScore: 8.1, reraNumber: "PRM/KA/RERA/1251", featured: false, verified: true,
  },
  {
    id: "prop-4",
    title: "Waterfront Apartment — Dubai Marina",
    location: "Dubai Marina",
    city: "Dubai",
    price: 2800000,
    currency: "AED",
    beds: 2, baths: 2, sqft: 1400,
    propertyType: "apartment", listingType: "sale",
    images: ["https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=600&q=80"],
    aiScore: 8.9, featured: true, verified: true,
  },
  {
    id: "prop-5",
    title: "Office Space — HITEC City, Hyderabad",
    location: "HITEC City",
    city: "Hyderabad",
    price: 120000,
    currency: "INR",
    sqft: 2000,
    propertyType: "commercial", listingType: "rent",
    images: ["https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80"],
    aiScore: 7.8, reraNumber: "P02400009900", verified: true,
  },
  {
    id: "prop-6",
    title: "Penthouse — Banjara Hills, Hyderabad",
    location: "Banjara Hills",
    city: "Hyderabad",
    price: 65000000,
    currency: "INR",
    beds: 4, baths: 4, sqft: 6000,
    propertyType: "penthouse", listingType: "sale",
    images: ["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80"],
    aiScore: 9.5, featured: true, verified: true,
  },
];

export default function FeaturedProperties() {
  return (
    <section className="py-20 bg-brand-black">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <p className="text-gold-400 text-sm tracking-widest uppercase mb-2">Curated Selection</p>
            <h2 className="section-heading">
              Featured <span className="gold-text">Properties</span>
            </h2>
            <p className="text-zinc-400 mt-3 max-w-md">
              Hand-picked, RERA-verified properties with AI-scored investment potential.
            </p>
          </div>
          <Link href="/buy" className="btn-outline-gold whitespace-nowrap self-start md:self-auto">
            View All Properties <ArrowRight size={16} />
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SAMPLE_PROPERTIES.map((p) => (
            <PropertyCard key={p.id} {...p} />
          ))}
        </div>
      </div>
    </section>
  );
}
