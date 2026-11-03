/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        fusion: "#ED1C24",
      },
    },
  },
  plugins: [],
};
