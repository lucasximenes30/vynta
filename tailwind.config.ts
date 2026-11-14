import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f2f8ee',
          100: '#e2f0d5',
          200: '#c8e88b',
          300: '#acd880',
          400: '#78b79c',
          500: '#32685b',
          600: '#294e48',
          700: '#23433e',
          800: '#203b36',
          900: '#1c322e',
          950: '#10231f',
        },
        sprout: { lime: '#c8e88b', lavender: '#ada6ce', cream: '#f7f8f2', ink: '#294e48' },
        surface: {
          50: '#f8f9fb',
          100: '#f1f3f7',
          200: '#e2e5ed',
          300: '#c8ccd8',
          400: '#a8adbb',
          500: '#8f93a1',
          600: '#7a7d8b',
          700: '#666875',
          800: '#282a32',
          900: '#16171d',
          950: '#0c0d10',
        },
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        elevated: '0 10px 40px rgba(0,0,0,0.1)',
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'marquee': {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'marquee-reverse': {
          '0%': { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0%)' },
        }
      },
      animation: {
        'slide-up-delayed': 'slide-up 0.5s ease-out 3s forwards',
        'marquee': 'marquee 70s linear infinite',
        'marquee-reverse': 'marquee-reverse 70s linear infinite',
      }
    },
  },
  plugins: [],
}

export default config
