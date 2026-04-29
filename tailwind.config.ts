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
          default: "#2a2a2a",
          active: "#ff6600",
        },
        text: {
          primary: "#ff6600",
          secondary: "#cc5500",
          muted: "#663300",
          white: "#ffffff",
        },
        accent: {
          blue: "#ff6600",
          cyan: "#ff8800",
          green: "#00ff41",
          red: "#ff3030",
          yellow: "#ffaa00",
          orange: "#ff6600",
        },
        profit: "#00ff41",
        loss: "#ff3030",
        nav: {
          bg: "#ff6600",
          text: "#000000",
          active: "#cc4400",
        },
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
