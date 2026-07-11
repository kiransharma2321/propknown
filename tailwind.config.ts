import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50:  "#fdf8ec",
          100: "#faefd0",
          200: "#f2ddaa",
          300: "#e8c97a",
          400: "#dfb85a",
          500: "#D6A63E",   // primary brand gold — solid fills/backgrounds only
          600: "#b8892f",
          700: "#95701f",
          800: "#7a5a18",
          // Text-safe gold: same hue, darkened to clear WCAG AA (6.2:1 on white).
          // #D6A63E itself is ~2.2:1 on white and must never be used as a text color.
          textsafe: "#7A5C1A",
        },
        navy: {
          DEFAULT: "#0C1D42",
          50:  "#eef1f6",
          100: "#d3daea",
          500: "#0C1D42",
          700: "#081530",
          900: "#050d1f",
        },
        cream:    "#FAF9F5",
        charcoal: "#121212",
        brand: {
          black: "#FFFFFF",   // site background — white
          white: "#1a1a1a",   // primary text — dark
          gray:  "#F8F8F8",   // secondary background
          dark:  "#1a1a1a",   // footer, admin
        },
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        sans:  ["var(--font-montserrat)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gold-gradient": "linear-gradient(135deg, #D6A63E 0%, #e8c97a 50%, #D6A63E 100%)",
      },
      animation: {
        "fade-in":    "fadeIn 0.5s ease-in-out",
        "slide-up":   "slideUp 0.5s ease-out",
        "pulse-gold": "pulseGold 2s infinite",
      },
      keyframes: {
        fadeIn:    { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp:   { "0%": { transform: "translateY(20px)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
        pulseGold: { "0%, 100%": { boxShadow: "0 0 0 0 rgba(214,166,62,0.4)" }, "70%": { boxShadow: "0 0 0 10px rgba(214,166,62,0)" } },
      },
    },
  },
  plugins: [],
};
export default config;
