import type { Metadata } from "next";
import Link from "next/link";

// Design previews only (branch design-preview). Never indexed; the real pages are untouched.
export const metadata: Metadata = { title: "Design preview", robots: { index: false, follow: false } };

export default function DesignPreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex gap-1 rounded-full bg-black/80 backdrop-blur px-2 py-1.5 text-xs text-white shadow-xl">
        <span className="px-2 py-1 text-white/60">Preview</span>
        {[1, 2, 3].map((n) => (
          <Link key={n} href={`/design-preview/${n}`} className="px-3 py-1 rounded-full hover:bg-white/15">Direction {n}</Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
