import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        obsidian: {
          950: "#09090b",
          900: "#101014",
          850: "#141419",
          800: "#1c1c24",
          700: "#272732",
          600: "#383847",
        },
        brand: {
          orange: "#FF9000",
          amber: "#FFA31A",
          gold: "#FFB84D",
          darkOrange: "#E07B00",
        },
      },
      boxShadow: {
        'glass-glow': '0 0 35px -5px rgba(255, 144, 0, 0.15)',
        'glass-card': '0 20px 40px -15px rgba(0, 0, 0, 0.7), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
        'specular': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.12)',
        'button-glow': '0 10px 25px -5px rgba(255, 144, 0, 0.35)',
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "shimmer": "shimmer 2.5s linear infinite",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;

