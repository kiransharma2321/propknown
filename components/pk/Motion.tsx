"use client";

import { useEffect, useRef, useState } from "react";

// Motion primitives, without an animation library (keeps homepage JavaScript small -- PageSpeed).
// Content is never hidden from the first paint, crawlers or no-JS visitors: <RevealObserver/>
// only "arms" elements that are below the fold when it starts (they slide up into place, see
// globals.css), and with prefers-reduced-motion nothing moves.

// Mount once per page that uses Reveal (components/pk/Reveal.tsx) / PriceBoard.
export function RevealObserver() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    // No getBoundingClientRect here: measuring every element would force layout of sections the
    // browser is skipping (content-visibility). The observer's first report tells us instead:
    // on screen now -> left as is; below the fold -> armed (dimmed) until it scrolls in.
    const seen = new WeakSet<Element>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const first = !seen.has(e.target); seen.add(e.target);
        if (e.isIntersecting) { if (!first) e.target.classList.add("is-in"); io.unobserve(e.target); }
        else if (first) e.target.classList.add("pk-armed");
      }
    }, { rootMargin: "0px 0px -40px 0px" });
    for (const el of Array.from(document.querySelectorAll("[data-reveal]"))) io.observe(el);
    return () => io.disconnect();
  }, []);
  return null;
}

// Counts up to a REAL number once visible. The final value is rendered on the server, so
// there's no layout jump and no fake intermediate numbers for crawlers.
export function CountUp({ value, suffix = "", className = "" }: { value: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now(), dur = 1100;
      const tick = (t: number) => {
        const k = Math.min(1, (t - start) / dur);
        setShown(Math.round(value * (1 - Math.pow(1 - k, 3))));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value]);
  return <span ref={ref} className={className}>{shown.toLocaleString("en-IN")}{suffix}</span>;
}
