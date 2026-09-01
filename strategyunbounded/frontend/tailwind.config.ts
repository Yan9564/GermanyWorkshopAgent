import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'page': '#F0EDE8',
        'surface': '#FAFAF8',
        'tint': '#E6E2DA',
        'indigo-brand': '#0F52D4',
        'violet-brand': '#0F52D4',
        'bright': '#5B8AF7',
        'rose-brand': '#D4500F',
        'text-default': '#141420',
        'text-muted': '#767883',
        'border-brand': '#C6C2BB',
        'green-brand': '#059669',
        'red-brand': '#DC2626',
        'amber-brand': '#C46E0E',
        'p1-bg': '#FEF0E8',
        'p2-bg': '#EBF1FF',
        'p3-bg': '#F2F1EF',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        serif: ['var(--font-serif)', 'serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      backgroundImage: {
        'gradient-action': 'linear-gradient(135deg, #0A3DBF, #0F52D4)',
      },
      borderRadius: {
        'xl2': '20px',
        'xl3': '24px',
      },
      boxShadow: {
        'card': '0 2px 12px rgba(15,82,212,0.07)',
        'card-hover': '0 8px 32px rgba(15,82,212,0.16)',
        'modal': '0 20px 80px rgba(15,82,212,0.22)',
        'fab': '0 4px 20px rgba(15,82,212,0.22)',
        'glow': '0 0 24px rgba(15,82,212,0.32)',
      },
      keyframes: {
        blink: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0' } },
        tpulse: {
          '0%,80%,100%': { transform: 'scale(0.8)', opacity: '0.5' },
          '40%': { transform: 'scale(1.2)', opacity: '1' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        spin: { to: { transform: 'rotate(360deg)' } },
        ringFill: { to: { strokeDashoffset: '0' } },
        pulse: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(15,82,212,0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(15,82,212,0)' },
        },
      },
      animation: {
        blink: 'blink 0.8s infinite',
        tpulse: 'tpulse 1.4s infinite',
        'tpulse-2': 'tpulse 1.4s 0.2s infinite',
        'tpulse-3': 'tpulse 1.4s 0.4s infinite',
        'fade-in-up': 'fadeInUp 0.5s ease both',
        'slide-up': 'slideUp 0.35s ease both',
        spin: 'spin 1s linear infinite',
        'fab-pulse': 'pulse 2s infinite',
      },
    },
  },
  plugins: [],
}
export default config
