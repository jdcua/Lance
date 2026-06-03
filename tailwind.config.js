/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "selector",
  theme: {
    extend: {
      colors: {
        accent: "#1D9E75",
        "page-bg": "#FAFAF9",
        "text-primary": "#1C1C1A",
        "text-secondary": "#6B6B67",
        "text-tertiary": "#A3A39E",
        border: "#E5E5E3",
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
        sans: ["-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "sans-serif"],
      },
      borderRadius: {
        card: "12px",
        component: "8px",
      },
    },
  },
  plugins: [],
};
