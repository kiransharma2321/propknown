"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { waLink, lastSearch, searchContextText, SEARCH_EVENT } from "@/lib/whatsapp";

// Page-specific openers win (a listing page is about that listing); otherwise the visitor's
// most recent AI search this session; otherwise the caller's fallback text.
function pageText(pathname: string): string | null {
  if (/^\/buy\/[^/]+/.test(pathname)) return `Hi, I'm interested in this listing on PropKnown: https://www.propknown.com${pathname}`;
  if (pathname.startsWith("/list-property") || pathname.startsWith("/sell")) return "Hi, I'd like to list my property on PropKnown.";
  if (pathname.startsWith("/nri")) return "Hi, I'm an NRI interested in buying property in India through PropKnown.";
  return null;
}

export function useContextualWhatsApp(fallback = "Hi PropKnown, I'm interested in your property services."): string {
  const pathname = usePathname() ?? "/";
  const [href, setHref] = useState(() => waLink(fallback));
  useEffect(() => {
    const update = () => {
      const page = pageText(pathname);
      const search = lastSearch();
      setHref(waLink(page ?? (search ? searchContextText(search) : fallback)));
    };
    update();
    window.addEventListener(SEARCH_EVENT, update);
    return () => window.removeEventListener(SEARCH_EVENT, update);
  }, [pathname, fallback]);
  return href;
}
