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
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
          '"Noto Color Emoji"',
        ],
        mono: [
          '"Geist Mono"',
          '"Geist Mono Fallback"',
          'ui-monospace',
          'SFMono-Regular',
          'monospace',
        ],
        // Add a specific class for data points
        data: [
          '"Geist Mono"',
          '"Geist Mono Fallback"',
          'ui-monospace',
          'SFMono-Regular',
          'monospace',
        ],
      },
    },
  },
  // Improve handling of special characters in class names
  separator: '_',
  safelist: [
    // Add any critical classes that might be dynamically generated
    'bg-primary',
    'text-white',
    'font-mono',
    'font-data'
  ],
  plugins: [],
}

