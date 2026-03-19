/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        jscolors: {
          crimson: "#8B1A1A",
          gold: "#C9A84C",
          bg: "#F2E8E8",
          text: "#1a0808",
        },
      },
      fontFamily: {
        syne: ["Syne", "sans-serif"],
        "dm-sans": ["DM Sans", "sans-serif"],
      },
      boxShadow: {
        panel: "0 18px 60px rgba(83, 20, 20, 0.12)",
        glow: "0 0 0 1px rgba(139, 26, 26, 0.12), 0 12px 30px rgba(139, 26, 26, 0.16)",
      },
      backgroundImage: {
        "arcad-grid":
          "linear-gradient(rgba(139,26,26,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(139,26,26,0.08) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
}
