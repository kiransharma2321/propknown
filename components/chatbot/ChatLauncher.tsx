"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import AIOrb from "./AIOrb";

const KnownAIChat = dynamic(() => import("./KnownAIChat"), { ssr: false });

// Renders just the closed-state button + label pill until the visitor actually shows intent to
// use it (hover/focus to preload, or a click to open immediately) -- KnownAIChat's own chunk
// (message state, quick replies, send/fetch logic, AIOrb animations) previously fetched, parsed,
// and mounted on every single homepage load whether or not anyone ever touched it. Markup here
// intentionally mirrors KnownAIChat's own closed-state button+pill exactly, so the handoff to the
// real component is visually seamless -- only one of the two is ever in the DOM at a time.
export default function ChatLauncher() {
  const [loaded, setLoaded]             = useState(false);
  const [openOnMount, setOpenOnMount]   = useState(false);

  const preload = useCallback(() => setLoaded(true), []);

  const handleClick = useCallback(() => {
    setOpenOnMount(true);
    setLoaded(true);
  }, []);

  if (loaded) {
    return <KnownAIChat initialOpen={openOnMount} />;
  }

  return (
    <>
      <button
        onMouseEnter={preload}
        onFocus={preload}
        onClick={handleClick}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full text-black shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-105"
        style={{ background: "#0a0a0a" }}
        aria-label="Open KnownAI chat"
        title="KnownAI — PropKnown AI Real Estate Expert"
      >
        <AIOrb size={38} />
      </button>

      <span
        className="fixed bottom-8 right-24 z-50 pointer-events-none whitespace-nowrap rounded-full text-xs font-semibold px-3 py-1.5 text-white shadow-lg"
        style={{ background: "#0a0a0a", border: "1px solid #C9A24B" }}
      >
        Ask KnownAI
      </span>
    </>
  );
}
