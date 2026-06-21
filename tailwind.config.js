/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          verdeEnergia: '#B7E000',
          verdeSalud: '#1EDB8F',
          moradoDesarrollo: '#6A2CFF',
          fucsiaEmocion: '#FF2E7A',
          negroConfianza: '#1A1A1A',
          grisApoyo: '#E6E6E6',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'sans-serif'],
        heading: ['Poppins', 'Roboto', 'sans-serif'],
        support: ['Nunito Sans', 'sans-serif'],
        mono: ['Roboto Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
