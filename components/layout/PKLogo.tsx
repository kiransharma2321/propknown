import Link from "next/link";
import Image from "next/image";

interface PKLogoProps {
  dark?: boolean;
}

export default function PKLogo({ dark = false }: PKLogoProps) {
  // ── FOOTER (dark background) ────────────────────────────────────────────────
  if (dark) {
    return (
      <Link href="/" aria-label="PropKnown Home" className="shrink-0 inline-flex items-center gap-3">
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: "44px", height: "44px", borderRadius: "10px",
          background: "#ffffff", flexShrink: 0, overflow: "hidden",
        }}>
          <Image src="/logo.png" alt="" width={0} height={0} sizes="36px"
            style={{ height: "36px", width: "36px", objectFit: "contain" }} />
        </span>
        <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span style={{
            color: "#ffffff", fontWeight: "700", fontSize: "15px",
            letterSpacing: "0.18em", fontFamily: "var(--font-playfair, Georgia, serif)",
          }}>
            PROPKNOWN
          </span>
          <span style={{
            color: "#C9A24B", fontSize: "8.5px", fontWeight: "600",
            letterSpacing: "0.22em", marginTop: "3px",
          }}>
            INFRA PVT LTD
          </span>
        </span>
      </Link>
    );
  }

  // ── NAVBAR (white background) ───────────────────────────────────────────────
  return (
    <Link href="/" aria-label="PropKnown Home" className="shrink-0 inline-flex items-center gap-3">
      {/* mix-blend-mode:multiply dissolves any white box in the PNG against the white navbar */}
      <Image
        src="/logo.png"
        alt="PropKnown logo"
        width={0}
        height={0}
        sizes="56px"
        priority
        style={{ height: "56px", width: "auto", display: "block", mixBlendMode: "multiply" }}
      />
      {/* Explicit HTML text — always visible, never hidden by image rendering */}
      <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
        <span style={{
          color: "#0a0a0a",
          fontWeight: "700",
          fontSize: "20px",
          letterSpacing: "0.12em",
          fontFamily: "var(--font-playfair, Georgia, serif)",
        }}>
          PROPKNOWN
        </span>
        <span style={{
          color: "#C9A24B",
          fontSize: "9px",
          fontWeight: "700",
          letterSpacing: "0.22em",
          marginTop: "4px",
          textTransform: "uppercase" as const,
        }}>
          INFRA PVT LTD
        </span>
      </span>
    </Link>
  );
}
