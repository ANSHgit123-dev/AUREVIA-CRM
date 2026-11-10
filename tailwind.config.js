/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#060B18',
          900: '#0B132B', // Deep navy sidebar
          800: '#1C2541', // Hover state
          700: '#3A506B', // Selected accent
          600: '#486581',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F8FAFC', // Cool off-white canvas
          subtle: '#F1F5F9', // Border and card backgrounds
          border: '#E2E8F0', // Crisp slate border
        },
        gold: {
          400: '#D4AF37',
          500: '#C5A880', // Premium real estate gold accent
          600: '#A88D65',
        },
        status: {
          available: '#10B981', // Emerald
          reserved: '#F59E0B',  // Amber
          token: '#F97316',     // Orange
          booked: '#3B82F6',    // Blue
          sold: '#64748B',      // Slate
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
        'elevated': '0 10px 15px -3px rgba(0, 0, 0, 0.06), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
};

