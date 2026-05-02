/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        border:    'hsl(var(--border) / <alpha-value>)',
        muted:     'hsl(var(--muted) / <alpha-value>)',
        'muted-foreground': 'hsl(var(--muted-foreground) / <alpha-value>)',
        primary:   'hsl(var(--primary) / <alpha-value>)',
        magma:     'hsl(var(--magma) / <alpha-value>)',
        amber:     'hsl(var(--amber) / <alpha-value>)',
        surface:   'hsl(var(--surface) / <alpha-value>)',
      },
      animation: {
        'ticker': 'ticker 45s linear infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'blink': 'blink 1s steps(1) infinite',
      },
      keyframes: {
        ticker: {
          from: { transform: 'translateX(0)' },
          to:   { transform: 'translateX(-50%)' },
        },
        blink: {
          '50%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}
