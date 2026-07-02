import Link from "next/link";
import { MapPin, Bed, Bath, Maximize, Star, Shield } from "lucide-react";
import CurrencyPrice from "@/components/ui/CurrencyPrice";

interface PropertyCardProps {
  id: string;
  title: string;
  location: string;
  city: string;
  price: number;
  currency?: string;
  beds?: number | null;
  baths?: number | null;
  sqft?: number | null;
  propertyType: string;
  listingType: string;
  images?: string[];
  aiScore?: number | null;
  reraNumber?: string | null;
  featured?: boolean;
  verified?: boolean;
}

export default function PropertyCard({
  id, title, location, city, price,
  beds, baths, sqft, propertyType, listingType,
  images = [], aiScore, reraNumber, featured, verified,
}: PropertyCardProps) {
  const img = images[0] ?? "/images/property-placeholder.jpg";

  return (
    <Link href={`/buy/${id}`} className="card-dark group block">
      {/* Image */}
      <div className="relative overflow-hidden aspect-[4/3]">
        <img
          src={img}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
          <span className="bg-gold-500 text-black text-[10px] font-bold px-2 py-1 rounded-sm tracking-wider uppercase">
            {listingType === "sale" ? "For Sale" : "For Rent"}
          </span>
          {featured && (
            <span className="bg-black/80 border border-gold-500 text-gold-400 text-[10px] font-bold px-2 py-1 rounded-sm tracking-wider uppercase">
              Featured
            </span>
          )}
        </div>
        {aiScore && (
          <div className="absolute top-3 right-3 bg-black/90 border border-gold-500 rounded-sm px-2 py-1 flex items-center gap-1">
            <Star size={10} className="text-gold-400 fill-gold-400" />
            <span className="text-gold-400 text-[11px] font-bold">{aiScore.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-center gap-1.5 text-zinc-500 text-xs mb-2">
          <MapPin size={12} />
          <span>{location}, {city}</span>
        </div>
        <h3 className="text-white font-semibold text-base mb-1 line-clamp-2 group-hover:text-gold-400 transition-colors">
          {title}
        </h3>
        <p className="text-xs text-zinc-500 mb-3 capitalize">{propertyType}</p>

        {/* Stats */}
        {(beds || baths || sqft) && (
          <div className="flex items-center gap-4 text-zinc-400 text-xs border-t border-zinc-800 pt-3 mb-3">
            {beds != null && (
              <span className="flex items-center gap-1.5">
                <Bed size={13} />
                {beds} Bed{beds !== 1 ? "s" : ""}
              </span>
            )}
            {baths != null && (
              <span className="flex items-center gap-1.5">
                <Bath size={13} />
                {baths} Bath{baths !== 1 ? "s" : ""}
              </span>
            )}
            {sqft != null && (
              <span className="flex items-center gap-1.5">
                <Maximize size={13} />
                {sqft.toLocaleString()} sqft
              </span>
            )}
          </div>
        )}

        {/* Price + RERA */}
        <div className="flex items-end justify-between">
          <div>
            <CurrencyPrice priceINR={price} />
            {reraNumber && (
              <div className="flex items-center gap-1 mt-1">
                <Shield size={10} className="text-green-400" />
                <span className="text-green-400 text-[10px]">RERA: {reraNumber}</span>
              </div>
            )}
          </div>
          {verified && (
            <span className="bg-green-950 border border-green-700 text-green-400 text-[10px] px-2 py-1 rounded-sm">
              Verified
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
