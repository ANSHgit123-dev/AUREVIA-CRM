/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        app: {
          bg: '#F5F6F7',
          surface: '#FFFFFF',
          border: '#E5E8EB',
          'border-strong': '#D0D5DD',
        },
        sidebar: {
          DEFAULT: '#1E2227', // Deep charcoal graphite
          hover: '#252A30',
          active: '#2C323B',
          border: '#2A2F37',
          text: '#94A3B8',
          'text-active': '#FFFFFF',
        },
        brand: {
          900: '#0F172A',
          800: '#1E293B', // Primary action navy
          700: '#334155',
          600: '#475569',
          accent: '#2563EB',
        },
        navy: {
          950: '#0F172A',
          900: '#1E293B',
          800: '#334155',
          700: '#475569',
          600: '#64748B',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F5F6F7',
          subtle: '#F1F3F5',
          border: '#E5E8EB',
        },
        gold: {
          400: '#D97706',
          500: '#B45309',
          600: '#92400E',
        },
        status: {
          available: '#16A34A', // Controlled emerald
          reserved: '#D97706',  // Muted amber
          token: '#EA580C',     // Muted orange
          booked: '#2563EB',    // Muted enterprise blue
          sold: '#64748B',      // Slate neutral
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'elevated': '0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
};

