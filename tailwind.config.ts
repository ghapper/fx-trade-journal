import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0a0a0f",
          secondary: "#111118",
          tertiary: "#1a1a24",
          card: "#13131d",
          hover: "#1e1e2e",
        },
        border: {
          subtle: "#1e1e2e",
          default: "#2a2a3e",
          active: "#3a3a5e",
        },
        text: {
          primary: "#e8e8f0",
          secondary: "#8888aa",
          muted: "#555570",
        },
        accent: {
          blue: "#3b82f6",
          cyan: "#06b6d4",
          green: "#22c55e",
          red: "#ef4444",
          yellow: "#eab308",
          purple: "#8b5cf6",
        },
        profit: "#22c55e",
        loss: "#ef4444",
      },
      fontFamily: {
        sans: ["'JetBrains Mono'", "monospace"],
        display: ["'Space Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
