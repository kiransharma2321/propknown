// Original CSS/SVG animated "AI orb" — a holographic-globe-style wireframe (latitude/longitude
// grid lines) around a crisp glowing gold core, on a dark backing disc so it "floats". Pure
// SVG strokes/gradients only — no blur filters, no external images/video, no third-party IP.
interface AIOrbProps {
  size?: number;
  className?: string;
  /** True while KnownAI is actively generating a reply — speeds up the rotation/shimmer.
   *  False (default) shows the slow idle "breathing" pulse. */
  active?: boolean;
}

export default function AIOrb({ size = 40, className = "", active = false }: AIOrbProps) {
  const uid = `${size}-${active ? "a" : "i"}`;
  const coreGrad = `orbCore-${uid}`;
  const ringDur  = active ? "3.5s" : "10s";
  const ringDurRev = active ? "2.6s" : "7s";
  const pulseDur = active ? "1.1s" : "2.6s";

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <defs>
          <radialGradient id={coreGrad} cx="42%" cy="38%" r="65%">
            <stop offset="0%"  stopColor="#fdf0c8" />
            <stop offset="50%" stopColor="#C9A24B" />
            <stop offset="100%" stopColor="#7a5d28" />
          </radialGradient>
        </defs>

        {/* Dark backing disc so the orb reads as a floating sphere, not a flat icon */}
        <circle cx="50" cy="50" r="48" fill="#0a0a0a" />

        {/* Globe wireframe — longitude meridians (rotating group) */}
        <g className="orb-ring-outer" style={{ animationDuration: ringDur }}>
          {[0, 30, 60, 90, 120, 150].map((deg) => (
            <ellipse
              key={deg}
              cx="50" cy="50" rx={44 * Math.abs(Math.cos((deg * Math.PI) / 180)) + 2} ry="44"
              transform={`rotate(${deg} 50 50)`}
              fill="none" stroke="#C9A24B" strokeWidth="0.5" opacity="0.28"
            />
          ))}
        </g>

        {/* Globe wireframe — latitude rings (counter-rotating group) */}
        <g className="orb-ring-inner" style={{ animationDuration: ringDurRev }}>
          <circle cx="50" cy="50" r="44" fill="none" stroke="#e8c97a" strokeWidth="0.6" opacity="0.4" />
          <ellipse cx="50" cy="50" rx="44" ry="26" fill="none" stroke="#e8c97a" strokeWidth="0.5" opacity="0.3" />
          <ellipse cx="50" cy="50" rx="44" ry="10" fill="none" stroke="#e8c97a" strokeWidth="0.5" opacity="0.25" />
        </g>

        {/* Crisp outer rim */}
        <circle cx="50" cy="50" r="46" fill="none" stroke="#C9A24B" strokeWidth="1" opacity="0.6" />

        {/* Glowing core — brightness pulse via CSS, no blur filter */}
        <circle
          className="orb-core"
          cx="50" cy="50" r="19"
          fill={`url(#${coreGrad})`}
          style={{ animationDuration: pulseDur }}
        />
        {/* Thin highlight ring for a crisp edge on the core */}
        <circle cx="50" cy="50" r="19" fill="none" stroke="#fdf0c8" strokeWidth="0.6" opacity="0.5" />
      </svg>
    </div>
  );
}
