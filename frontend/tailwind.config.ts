import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#f5f5f4",
        panel: "#1d1713",
        app: "#120e0b",
        accent: "#f0b167",
        "accent-soft": "#f7e3c2",
        muted: "#302721",
        gold: "#d89a42",
        sage: "#8ca873",
        coral: "#dc7a58"
      },
      backgroundImage: {
        "hero-grid":
          "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))"
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)"],
        body: ["var(--font-source-sans)"]
      },
      boxShadow: {
        panel: "0 22px 60px rgba(0, 0, 0, 0.32)"
      }
    }
  },
  plugins: []
};

export default config;
