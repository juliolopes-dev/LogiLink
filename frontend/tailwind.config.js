/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base (Bezerra Neutral)
        background: {
          DEFAULT: '#f1f2f3',
          subtle: '#e8e9ea',
        },
        surface: {
          DEFAULT: '#ffffff',
          elevated: '#ffffff',
        },
        border: {
          DEFAULT: '#d1d5db',
          subtle: '#e5e7eb',
        },
        // Accent (Amarelo Bezerra)
        accent: {
          DEFAULT: '#f5ad00',
          hover: '#d99800',
          subtle: '#fef3cd',
          text: '#252525',
        },
        // Secondary (Cinza Bezerra)
        secondary: {
          DEFAULT: '#252525',
          hover: '#1a1a1a',
        },
        // Semantic
        success: {
          DEFAULT: '#16a34a',
          subtle: '#f0fdf4',
          text: '#166534',
        },
        warning: {
          DEFAULT: '#d97706',
          subtle: '#fffbeb',
          text: '#92400e',
        },
        danger: {
          DEFAULT: '#dc2626',
          subtle: '#fef2f2',
          text: '#991b1b',
        },
        info: {
          DEFAULT: '#0284c7',
          subtle: '#f0f9ff',
          text: '#075985',
        },
        // Filiais
        filial: {
          '00': '#3b82f6', // Petrolina
          '01': '#10b981', // Juazeiro
          '02': '#f59e0b', // Salgueiro
          '03': '#8b5cf6', // Garantia
          '04': '#6366f1', // CD
          '05': '#ec4899', // Bonfim
          '06': '#14b8a6', // Picos
        },
      },
      fontFamily: {
        sans: ['Blinker', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
      },
      borderRadius: {
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
        'full': '9999px',
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'none': 'none',
      },
    },
  },
  plugins: [],
}
