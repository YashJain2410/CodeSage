import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#7C65C1',
        deep: '#3D2F6B',
        lavender: {
          50: '#F8F7FF',
          100: '#EAE8F5',
          200: '#DCD6F2',
          300: '#B8A9E0'
        },
        cardPurple: '#8B5CF6',
        darkBg: '#1A1625',
        darkCard: '#2D2440',
        darkBorder: '#3D3358',
        offwhite: '#F8F7FF'
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem'
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'JetBrains Mono', 'monospace']
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-16px)' }
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        shimmer: {
          '0%': { transform: 'translateX(-120%) skewX(-18deg)' },
          '100%': { transform: 'translateX(220%) skewX(-18deg)' }
        },
        gradientBorder: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' }
        },
        blink: {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' }
        }
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        fadeInUp: 'fadeInUp 0.7s ease both',
        shimmer: 'shimmer 0.85s ease forwards',
        gradientBorder: 'gradientBorder 3s ease infinite',
        blink: 'blink 1s steps(1) infinite'
      }
    }
  },
  plugins: []
};

export default config;
