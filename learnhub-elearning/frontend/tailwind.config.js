/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'var(--surface)',
          card: 'var(--surface-card)',
          hover: 'var(--surface-hover)',
          input: 'var(--surface-input)',
        },
        accent: {
          DEFAULT: '#FACC15',
          hover: '#EAB308',
        },
        heading: 'var(--text-primary)',
        txt: {
          DEFAULT: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        bdr: {
          DEFAULT: 'var(--border)',
          hover: 'var(--border-hover)',
        }
      },
      boxShadow: {
        'brutal': '4px 4px 0px 0px var(--shadow-brutal)',
        'brutal-sm': '2px 2px 0px 0px var(--shadow-brutal)',
        'brutal-lg': '6px 6px 0px 0px var(--shadow-brutal)',
        'brutal-black': '4px 4px 0px 0px rgba(0,0,0,1)',
      },
    },
  },
  plugins: [],
}
