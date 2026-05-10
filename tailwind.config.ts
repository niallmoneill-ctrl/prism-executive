import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#0F1D35", light: "#1A2D4D" },
        gold: { DEFAULT: "#B8975A", dark: "#96793F", light: "#D4BF8A" },
        prism: { bg: "#F5F3EF", card: "#FFFFFF", border: "#E8E5DF", black: "#1A1A1A", charcoal: "#333333", muted: "#888888" },
        dim: { exploration: "#9B4D3A", structure: "#3A5A8C", drive: "#3A7052", connection: "#6B4A7D" },
      },
      fontFamily: {
        display: ["Cormorant Garamond", "Georgia", "Times New Roman", "serif"],
        body: ["DM Sans", "Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
