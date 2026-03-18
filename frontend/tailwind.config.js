/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0052D9',
          light: '#1890FF',
          lighter: '#40A9FF',
        },
        background: {
          DEFAULT: '#F5F7FA',
          white: '#FFFFFF',
        },
        text: {
          primary: '#1D2129',
          secondary: '#4E5969',
          tertiary: '#86909C',
        },
        functional: {
          success: '#00B42A',
          error: '#F53F3F',
          warning: '#FF7D00',
          info: '#722ED1',
        },
      },
      fontFamily: {
        sans: ['PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
}
