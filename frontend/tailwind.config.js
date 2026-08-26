/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        space: {
          950: '#030614',
          900: '#060b1d',
          800: '#0a1230',
          700: '#111a3d',
        },
      },
      fontFamily: {
        display: ['var(--font-grotesk)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 28px rgba(34, 211, 238, 0.25)',
        'glow-sm': '0 0 14px rgba(34, 211, 238, 0.2)',
        'glow-violet': '0 0 20px rgba(139, 92, 246, 0.25)',
        panel: '0 20px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(103, 232, 249, 0.08)',
      },
      animation: {
        'fade-up': 'fadeUp 0.35s ease-out both',
        'fade-in': 'fadeIn 0.4s ease-out both',
        'bounce-dot': 'bounceDot 1.2s ease-in-out infinite',
        twinkle: 'twinkle 3s ease-in-out infinite',
        shoot: 'shoot 7s linear infinite',
        'glow-drift': 'glowDrift 22s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        bounceDot: {
          '0%, 60%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '30%': { transform: 'translateY(-4px)', opacity: '1' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0.15', transform: 'scale(0.85)' },
          '50%': { opacity: '1', transform: 'scale(1.15)' },
        },
        shoot: {
          '0%': { transform: 'translate3d(0, 0, 0) rotate(-32deg) scaleX(0.4)', opacity: '0' },
          '3%': { opacity: '1' },
          '12%': { transform: 'translate3d(-46vw, 26vh, 0) rotate(-32deg) scaleX(1)', opacity: '0.9' },
          '16%': { transform: 'translate3d(-58vw, 33vh, 0) rotate(-32deg) scaleX(0.6)', opacity: '0' },
          '100%': { transform: 'translate3d(-58vw, 33vh, 0)', opacity: '0' },
        },
        glowDrift: {
          from: { transform: 'translate3d(-4%, -2%, 0) scale(1)' },
          to: { transform: 'translate3d(4%, 3%, 0) scale(1.1)' },
        },
      },
    },
  },
  plugins: [],
};
