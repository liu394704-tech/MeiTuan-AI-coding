/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 美团黄主色系
        brand: {
          50: '#FFFBEA',
          100: '#FFF3C4',
          200: '#FCE588',
          300: '#FADB5F',
          400: '#F7C948',
          500: '#FFC300', // 主色 美团黄
          600: '#E6AC00',
          700: '#B98900',
          800: '#8C6500',
          900: '#5C4200',
        },
        // 强调暖色 (用于次要 CTA / 标语)
        accent: {
          50: '#FFF1E6',
          100: '#FFE0C2',
          400: '#FF9F1C',
          500: '#FF8C00',
          600: '#E07B00',
        },
        success: '#22A06B',
        warning: '#F0AD4E',
        danger: '#E5484D',
        ink: {
          900: '#1A1300',
          700: '#3D3324',
          500: '#7A6F5C',
          300: '#D8CFB8',
          100: '#FFF8E1',
        },
        // 页面背景：略带奶油色
        canvas: '#FFF7DC',
      },
      fontSize: {
        base: ['16px', '1.6'],
        'lg-elder': ['18px', '1.6'],
        'xl-elder': ['20px', '1.6'],
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      boxShadow: {
        soft: '0 4px 24px rgba(184, 134, 11, 0.10)',
        glow: '0 8px 28px rgba(255, 195, 0, 0.35)',
      },
      backgroundImage: {
        // 顶部 hero 渐变（美团黄）
        'hero-yellow':
          'linear-gradient(135deg, #FFC300 0%, #FFD53D 45%, #FFE680 100%)',
        // 卡片细微纹理
        'soft-dot':
          'radial-gradient(rgba(184, 134, 11, 0.08) 1px, transparent 1px)',
      },
      backgroundSize: {
        'dot-md': '14px 14px',
      },
    },
  },
  plugins: [],
};
