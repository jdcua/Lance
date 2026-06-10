/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "selector",
  theme: {
    extend: {
      colors: {
        accent: "#1EC98A",
        "page-bg": "#F8F7F3",
        "text-primary": "#181716",
        "text-secondary": "#68675F",
        "text-tertiary": "#A3A39E",
        border: "#E3E2DB",
        warning: {
          text: "#854F0B",
          bg: "#FAEEDA",
        },
        danger: {
          text: "#A32D2D",
          bg: "#FCEBEB",
        },
        info: {
          text: "#185FA5",
          bg: "#E6F1FB",
        },
      },
      fontFamily: {
        display: ["'Syne'", "sans-serif"],
        body:    ["'Inter'", "sans-serif"],
        mono:    ["'JetBrains Mono'", "monospace"],
        sans:    ["'Inter'", "sans-serif"],
      },
      borderRadius: {
        card: "12px",
        component: "8px",
      },
    },
  },
  plugins: [],
};
