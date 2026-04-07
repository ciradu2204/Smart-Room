/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
    },
    fontSize: {
      xs: ['0.6875rem', { lineHeight: '1rem' }],       // 11px
      sm: ['0.8125rem', { lineHeight: '1.25rem' }],     // 13px
      base: ['0.9375rem', { lineHeight: '1.5rem' }],    // 15px
      lg: ['1.125rem', { lineHeight: '1.4' }],          // 18px
      xl: ['1.25rem', { lineHeight: '1.25' }],          // 20px
      '2xl': ['1.5rem', { lineHeight: '1.25' }],        // 24px
      '4xl': ['2.25rem', { lineHeight: '1.15' }],       // 36px
    },
    extend: {
      colors: {
        brand: {
          DEFAULT: '#059669', // emerald-600
          hover: '#047857',   // emerald-700
          ring: '#10b981',    // emerald-500
        },
        status: {
          available: '#059669',  // emerald-600
          occupied: '#e11d48',   // rose-600
          pending: '#f59e0b',    // amber-500
          released: '#9ca3af',   // gray-400
        },
        feedback: {
          error: '#e11d48',    // rose-600
          warning: '#f59e0b',  // amber-500
          info: '#0284c7',     // sky-600
        },
      },
      maxWidth: {
        page: '1280px',
      },
      spacing: {
        // All spacing is multiples of 4px (Tailwind default).
        // Documenting key design-system values:
        // 4:  16px — between related elements
        // 5:  20px — card padding
        // 6:  24px — mobile page padding
        // 8:  32px — section spacing
        // 12: 48px — desktop page padding
      },
      borderRadius: {
        card: '8px',
      },
      transitionDuration: {
        color: '150ms',
        layout: '200ms',
      },
    },
  },
  plugins: [],
}
