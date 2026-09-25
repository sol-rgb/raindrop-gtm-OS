/** @type {import('tailwindcss').Config} */
// Every value here was read off raindrop.ai's own stylesheet, so the OS and
// the product render as one system. Do not invent colours; extend from these.
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces. The page is a warm off-white, cards are true white.
        bg: "#fcfbf9",
        surface: "#ffffff",
        "surface-2": "#f4f3ef",
        // Table and panel headers.
        head: "#f8f7f3",
        rail: "#faf9f6",

        // Type. Their ink is a dark blue-green, never black.
        ink: "#18211f",
        text: "#4a524e",
        muted: "#68706b",
        faint: "#8b918c",

        // Raindrop's one accent, darkened for a light background.
        accent: "#4b7d88",
        "accent-soft": "#deedf0",

        // Status, in the same muted register.
        good: "#4f7a54",
        warn: "#96702c",
        bad: "#9e4b3d",
      },
      borderColor: {
        DEFAULT: "#1918141f",
        hair: "#1918141f",
        strong: "#00000026",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      maxWidth: {
        shell: "1180px",
      },
    },
  },
  plugins: [],
};
