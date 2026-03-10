/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx,vue,svelte}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#4f46e5", // indigo-600
        },
        accent: {
          DEFAULT: "#d946ef", // fuchsia-500
        },
      },
    },
  },
  plugins: [],
};
