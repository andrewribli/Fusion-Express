/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        fusion: "#ED1C24",
        "fusion-red": "#ED1C24",
        orange: "#ff6a00",
        page: "#F5F5F5",
        ink: "#111111",
      },
      borderRadius: {
        card: "16px",
      },
    },
  },
  plugins: [],
};
