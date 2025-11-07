/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class", // ✅ Enables manual dark mode using the .dark class
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        studymateBlue: "#2563EB", // optional: for your brand color
        studymateDark: "#0b0c10",
      },
    },
  },
  plugins: [],
};
