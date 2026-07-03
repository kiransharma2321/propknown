"use client";

import Link from "next/link";
import { User } from "lucide-react";
import { useBuyer } from "./BuyerProvider";

export default function AccountLink({ className }: { className?: string }) {
  const { buyer } = useBuyer();

  return (
    <Link href={buyer ? "/account" : "/account/login"} className={className ?? "flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors"}>
      <User size={13} />
      {buyer ? buyer.name.split(" ")[0] : "Login"}
    </Link>
  );
}
