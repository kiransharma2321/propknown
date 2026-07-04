import Link from "next/link";
import { MapPin, Bed, Bath, Maximize, Star, Shield } from "lucide-react";
import CurrencyPrice from "@/components/ui/CurrencyPrice";
import FavoriteButton from "@/components/buyer/FavoriteButton";
import VerificationBadge, { type VerificationFlags } from "@/components/ui/VerificationBadge";

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
  /** @deprecated pass verificationFlags for real per-check honesty instead of a single bit */
  verified?: boolean;
  verificationFlags?: VerificationFlags;
}

export default function PropertyCard({
  id, title, location, city, price, currency,
  beds, baths, sqft, propertyType, listingType,
  images = [], aiScore, reraNumber, featured, verified, verificationFlags,
}: PropertyCardProps) {
  const img = images[0] ?? "/images/property-placeholder.jpg";
  // Back-compat: a legacy `verified` boolean maps to "all checks passed"; prefer real
  // per-check flags whenever the caller provides them.
  const flags: VerificationFlags = verificationFlags ?? (verified
    ? { reraVerified: true, titleVerified: true, documentsChecked: true, layoutApproved: true, encumbranceClear: true, reraNumber: reraNumber ?? undefined }
    : {});

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
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {aiScore && (
            <div className="bg-black/90 border border-gold-500 rounded-sm px-2 py-1 flex items-center gap-1">
              <Star size={10} className="text-gold-400 fill-gold-400" />
              <span className="text-gold-400 text-[11px] font-bold">{aiScore.toFixed(1)}</span>
            </div>
          )}
          <FavoriteButton
            listingId={id}
            title={title}
            location={`${location}, ${city}`}
            image={img}
            className="w-8 h-8 bg-black/70 rounded-full flex items-center justify-center hover:bg-black/90 transition-colors"
            strokeColor="#ccc"
          />
        </div>
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
            <CurrencyPrice priceINR={price} sourceCurrency={currency} />
            {reraNumber && (
              <div className="flex items-center gap-1 mt-1">
                <Shield size={10} className="text-green-400" />
                <span className="text-green-400 text-[10px]">RERA: {reraNumber}</span>
              </div>
            )}
          </div>
          <VerificationBadge flags={flags} compact dark />
        </div>
      </div>
    </Link>
  );
}
