// Original CSS/SVG animated "AI orb" — concentric rotating rings around a pulsing glowing
// core, in PropKnown gold/dark brand colors. No external images/assets, no third-party IP.
interface AIOrbProps {
  size?: number;
  className?: string;
}

export default function AIOrb({ size = 40, className = "" }: AIOrbProps) {
  const gradId = `orbCoreGrad-${size}`;
  const glowId = `orbGlowGrad-${size}`;

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" width={size} height={size} className="overflow-visible">
        <defs>
          <radialGradient id={gradId} cx="50%" cy="42%" r="60%">
            <stop offset="0%"  stopColor="#f5dfa0" />
            <stop offset="45%" stopColor="#C9A24B" />
            <stop offset="100%" stopColor="#8a6a2e" />
          </radialGradient>
          <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
            <stop offset="0%"  stopColor="#C9A24B" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#C9A24B" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Soft outer glow, pulsing */}
        <circle className="orb-glow" cx="50" cy="50" r="46" fill={`url(#${glowId})`} />

        {/* Outer ring — dashed, slow clockwise rotation */}
        <circle
          className="orb-ring-outer"
          cx="50" cy="50" r="42"
          fill="none" stroke="#C9A24B" strokeWidth="2"
          strokeDasharray="6 10" strokeLinecap="round" opacity="0.85"
        />

        {/* Inner ring — dashed, faster counter-clockwise rotation */}
        <circle
          className="orb-ring-inner"
          cx="50" cy="50" r="32"
          fill="none" stroke="#e8c97a" strokeWidth="1.5"
          strokeDasharray="3 7" strokeLinecap="round" opacity="0.7"
        />

        {/* Glowing core */}
        <circle className="orb-core" cx="50" cy="50" r="20" fill={`url(#${gradId})`} />
      </svg>
    </div>
  );
}
