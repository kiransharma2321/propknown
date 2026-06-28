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
          200: "#f4dfa0",
          300: "#e8c97a",
          400: "#d9b45a",
          500: "#C9A24B",   // primary brand gold
          600: "#b8922f",
          700: "#956f1f",
          800: "#7a5a18",
          900: "#664b15",
        },
        brand: {
          black: "#FFFFFF",   // site background — white
          white: "#1a1a1a",   // primary text — dark
          gray:  "#F8F8F8",   // secondary background
          dark:  "#1a1a1a",   // footer, admin
        },
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        sans:  ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gold-gradient": "linear-gradient(135deg, #C9A24B 0%, #e8c97a 50%, #C9A24B 100%)",
      },
      animation: {
        "fade-in":    "fadeIn 0.5s ease-in-out",
        "slide-up":   "slideUp 0.5s ease-out",
        "pulse-gold": "pulseGold 2s infinite",
      },
      keyframes: {
        fadeIn:    { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp:   { "0%": { transform: "translateY(20px)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
        pulseGold: { "0%, 100%": { boxShadow: "0 0 0 0 rgba(201,162,75,0.4)" }, "70%": { boxShadow: "0 0 0 10px rgba(201,162,75,0)" } },
      },
    },
  },
  plugins: [],
};
export default config;
