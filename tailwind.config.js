/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EAF3FF',
          100: '#D6E7FF',
          200: '#A8CBFF',
          300: '#79AEFF',
          400: '#4A91FF',
          500: '#1F6FEB',
          600: '#1657BF',
          700: '#0E4093',
          800: '#082A66',
          900: '#04153A',
        },
        success: '#28A745',
        warning: '#F0AD4E',
        danger: '#D9534F',
        ink: {
          900: '#0F172A',
          700: '#334155',
          500: '#64748B',
          300: '#CBD5E1',
          100: '#F1F5F9',
        },
      },
      fontSize: {
        // 适老化：基准 16px，可由 html.data-size 切换
        'base': ['16px', '1.6'],
        'lg-elder': ['18px', '1.6'],
        'xl-elder': ['20px', '1.6'],
      },
      borderRadius: {
        'xl2': '1.25rem',
      },
      boxShadow: {
        soft: '0 4px 24px rgba(15, 23, 42, 0.06)',
      },
    },
  },
  plugins: [],
};
