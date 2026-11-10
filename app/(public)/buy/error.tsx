"use client";

import { useEffect } from "react";
import Link from "next/link";

// Error boundary for every /buy page (list, /buy/[id], /buy/submission/[id]): if one component
// throws in the browser, the visitor gets this instead of a blank "Application error" screen.
export default function BuyError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[buy] page error:", error);
  }, [error]);

  return (
    <div className="pt-32 pb-20 bg-white min-h-screen">
      <div className="max-w-xl mx-auto px-4 text-center">
        <h1 className="heading-h2 mb-3">Something went wrong showing this property</h1>
        <p className="text-gray-500 mb-6">Please try again. If it keeps happening, WhatsApp us on 70130 16003 and we&apos;ll send you the details directly.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="btn-primary">Try again</button>
          <Link href="/buy" className="btn-secondary">Back to all properties</Link>
        </div>
      </div>
    </div>
  );
}
