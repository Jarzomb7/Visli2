import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
        display: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      colors: {
        navy: {
          900: "#060d2b",
          800: "#0a1647",
          700: "#0f1f6f",
        },
      },
    },
  },
  plugins: [],
};
export default config;
