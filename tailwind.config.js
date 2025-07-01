/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      './app/**/*.{js,ts,jsx,tsx}', // for app dir
      './src/**/*.{js,ts,jsx,tsx}', // if using src dir
      './pages/**/*.{js,ts,jsx,tsx}', // if using pages dir
      './components/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
      extend: {},
    },
    plugins: [],
  }
  