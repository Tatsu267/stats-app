/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937', // 背景ベース
          900: '#111827', // 暗部
          950: '#030712', // 最暗部
        },
        // 視認性の高いアクセントカラー
        brand: {
          primary: '#3b82f6', // blue-500
          secondary: '#8b5cf6', // violet-500
          accent: '#f59e0b', // amber-500
        }
      },
      fontFamily: {
        sans: [
          '"Inter"', 
          'system-ui', 
          '-apple-system', 
          'BlinkMacSystemFont', 
          '"Segoe UI"', 
          'Roboto', 
          '"Helvetica Neue"', 
          'Arial', 
          'sans-serif'
        ],
      },
      // 文字サイズのジャンプ率を定義
      fontSize: {
        'xxs': '0.625rem', // 10px
        'xs': '0.75rem',   // 12px
        'sm': '0.875rem',  // 14px
        'base': '1rem',    // 16px
        'lg': '1.125rem',  // 18px
        'xl': '1.25rem',   // 20px
        '2xl': '1.5rem',   // 24px
        '3xl': '2rem',     // 32px (強調用)
        '4xl': '2.5rem',   // 40px (数字強調用)
      }
    },
  },
  plugins: [],
}