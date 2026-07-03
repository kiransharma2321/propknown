"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useBuyer } from "./BuyerProvider";

interface Props {
  listingId: string;
  title: string;
  priceDisplay?: string;
  location?: string;
  image?: string;
  className?: string;
  strokeColor?: string;
}

export default function FavoriteButton({ listingId, title, priceDisplay, location, image, className, strokeColor = "#555" }: Props) {
  const { buyer, favoriteIds, toggleFavorite } = useBuyer();
  const router = useRouter();
  const isFav = favoriteIds.has(listingId);

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!buyer) {
      router.push(`/account/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    await toggleFavorite({ listingId, title, priceDisplay, location, image });
  };

  return (
    <button
      onClick={onClick}
      aria-label={isFav ? "Remove from favorites" : "Save to favorites"}
      className={className ?? "w-8 h-8 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-sm"}
    >
      <Heart size={14} fill={isFav ? "#C9A24B" : "none"} stroke={isFav ? "#C9A24B" : strokeColor} />
    </button>
  );
}
