"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

// M9: speak a question (English, Telugu or Hindi) using the browser's built-in speech
// recognition. The text lands in the input so the user can check it before sending. Hidden on
// browsers without support. (The browser, not PropKnown, converts the speech.)
type Rec = { lang: string; interimResults: boolean; maxAlternatives: number; start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };
const LANGS = [["en-IN", "EN"], ["te-IN", "తె"], ["hi-IN", "हि"]] as const;

export default function VoiceInput({ onText, disabled }: { onText: (t: string) => void; disabled?: boolean }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [lang, setLang] = useState<string>("en-IN");
  const rec = useRef<Rec | null>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    setSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);
  if (!supported) return null;

  const toggle = () => {
    if (listening) { rec.current?.stop(); return; }
    const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    const R = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!R) return;
    const r = new R();
    r.lang = lang; r.interimResults = false; r.maxAlternatives = 1;
    r.onresult = (e) => { const t = e.results[0]?.[0]?.transcript; if (t) onText(t); };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    setListening(true);
    r.start();
  };

  return (
    <div className="flex items-center gap-1 shrink-0">
      <select aria-label="Voice language" value={lang} onChange={(e) => setLang(e.target.value)} disabled={listening || disabled}
        className="text-[11px] rounded-md px-1 py-1 text-gray-200" style={{ background: "#2a2a2a", border: "1px solid #444" }}>
        {LANGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <button type="button" onClick={toggle} disabled={disabled} aria-label={listening ? "Stop listening" : "Speak your question"} title="Speak your question"
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all disabled:opacity-40 ${listening ? "bg-red-600 text-white animate-pulse" : "text-gray-200"}`}
        style={listening ? undefined : { background: "#2a2a2a", border: "1px solid #444" }}>
        {listening ? <MicOff size={16} /> : <Mic size={16} />}
      </button>
    </div>
  );
}
