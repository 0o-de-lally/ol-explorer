/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Adding the existing color scheme based on the styles I observed
        primary: '#E75A5C',
        background: '#0B1221',
        secondary: '#1A2235',
        border: '#1E2736',
        text: {
          light: '#FFFFFF',
          muted: '#8F9BB3'
        }
      },
    },
  },
  plugins: [],
}

