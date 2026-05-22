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
        panel: "#2b2a27",
        app: "#151412",
        accent: "#8b7dff",
        "accent-soft": "#ece9ff",
        muted: "#3a3935",
        gold: "#d28a1d",
        sage: "#79a72b",
        coral: "#e76c39"
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
