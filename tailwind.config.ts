import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        midnight: '#101828',
        surface: '#182230',
        raised: '#1F2A3A',
        lime: '#C7F43D',
        cream: '#F7F6F1',
        electric: '#4D8DFF',
        coral: '#FF655D',
        mint: '#3DDC97',
        slate: '#667085',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: { xl2: '1.25rem', xl3: '1.75rem' },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.8)',
        glow: '0 0 24px -6px rgba(199,244,61,0.45)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'none' } },
        'pop-in': { '0%': { opacity: '0', transform: 'scale(0.94)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease-out both',
        'pop-in': 'pop-in 0.2s ease-out both',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
};
export default config;
