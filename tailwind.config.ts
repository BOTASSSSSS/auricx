import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#09090B",
        card: "#111114",
        "card-hover": "#16161A",
        border: "#1E1E24",
        muted: "#71717A",
        accent: "#15D3E8",
        "accent-dim": "#0E95A3",
        positive: "#22C55E",
        negative: "#EF4444",
        warning: "#F59E0B",
      },
      fontFamily: {
        sora: ["var(--font-sora)", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(21, 211, 232, 0.15)",
        "glow-strong": "0 0 30px rgba(21, 211, 232, 0.25)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;
