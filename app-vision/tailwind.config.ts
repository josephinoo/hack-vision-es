import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:         '#0d0d0b',
        'bg-2':     '#111110',
        'bg-3':     '#1a1a17',
        fg:         '#e8e5d8',
        'fg-muted': '#6b6860',
        accent:     '#ff4500',
        'accent-2': '#ff6a33',
        border:     '#2a2a26',
        success:    '#3ddc84',
        warning:    '#ffc107',
      },
      fontFamily: {
        mono:  ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
        title: ['var(--font-title)', 'Impact', 'ui-sans-serif', 'sans-serif'],
        sans:  ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'scanline':     'scanline 4s linear infinite',
        'pulse-dot':    'pulse-dot 2s ease-in-out infinite',
        'fade-in':      'fade-in 0.3s ease-out',
        'slide-in':     'slide-in 0.25s ease-out',
        'blink':        'blink 1.2s step-end infinite',
      },
      keyframes: {
        scanline: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.3' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          from: { opacity: '0', transform: 'translateX(-8px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}

export default config
