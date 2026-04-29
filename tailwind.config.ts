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
          primary: "#000000",
          secondary: "#0a0a0a",
          tertiary: "#111111",
          card: "#0d0d0d",
          hover: "#1a1a1a",
        },
        border: {
          subtle: "#1a1a1a",
          default: "#222222",
          active: "#ff6600",
        },
        text: {
          primary: "#ffffff",
          secondary: "#aaaaaa",
          muted: "#555555",
        },
        accent: {
          blue: "#ff6600",
          cyan: "#ff8800",
          green: "#00ff41",
          red: "#ff3030",
          yellow: "#ffaa00",
          purple: "#ff6600",
          orange: "#ff6600",
        },
        profit: "#00ff41",
        loss: "#ff3030",
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
