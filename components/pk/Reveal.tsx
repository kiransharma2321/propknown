// Scroll reveal wrapper (server component, no JavaScript of its own): <RevealObserver/> in
// Motion.tsx arms below-the-fold [data-reveal] elements; the transition lives in globals.css.
export function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return <div data-reveal className={className} style={delay ? { transitionDelay: `${delay}s` } : undefined}>{children}</div>;
}
