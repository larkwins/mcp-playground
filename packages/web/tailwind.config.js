/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        teal: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
        },
        stone: {
          0: '#FFFFFF',
          50: '#FAFAF9',
          100: '#F5F5F4',
          150: '#EFEEEC',
          200: '#E7E5E4',
          300: '#D6D3D1',
        },
        ink: {
          0: '#1C1917',
          1: '#57534E',
          2: '#8A857F',
          3: '#A8A29E',
          code: '#0C1B1A',
        },
        brand: {
          green: '#16A34A',
          red: '#DC2626',
          amber: '#EA580C',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        sm: '0 1px 2px rgba(28,25,23,.06)',
        md: '0 10px 30px -10px rgba(28,25,23,.18)',
        glow: '0 6px 16px -5px rgba(13,148,136,.6)',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'none' },
        },
        fadeDown: {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'none' },
        },
        ping2: {
          '0%': { transform: 'scale(.8)', opacity: '.6' },
          '80%,100%': { transform: 'scale(2)', opacity: '0' },
        },
      },
      animation: {
        fadeUp: 'fadeUp .45s cubic-bezier(.16,1,.3,1) both',
        fadeDown: 'fadeDown .45s cubic-bezier(.16,1,.3,1) both',
        ping2: 'ping2 1.8s cubic-bezier(0,0,.2,1) infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
