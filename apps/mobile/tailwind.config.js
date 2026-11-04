/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        fusion: "#ED1C24",
        navy: "#111827",
        gold: "#FDB927",
        page: "#f3f4f6",
        ink: "#111111",
        muted: "#9ca3af",
      },
      fontFamily: {
        sans: ["Montserrat_400Regular"],
        "sans-medium": ["Montserrat_500Medium"],
        "sans-semibold": ["Montserrat_600SemiBold"],
        "sans-bold": ["Montserrat_700Bold"],
      },
    },
  },
  plugins: [],
};
