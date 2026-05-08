// [auto] Tailwind theme config
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      spacing: {
        '4.5': '1.125rem',
        '5.5': '1.375rem',
        '7.5': '1.875rem',
        '8.5': '2.125rem',
        '9.5': '2.375rem',
        '10.5': '2.625rem',
        '11.5': '2.875rem',
        '13': '3.25rem',
      },
      colors: {
        // CSS variable-based semantic tokens
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',

        // Nova brand colors (direct HSL values)
        nova: {
          50: 'hsl(270, 100%, 98%)',
          100: 'hsl(270, 100%, 95%)',
          200: 'hsl(270, 100%, 90%)',
          300: 'hsl(270, 95%, 82%)',
          400: 'hsl(270, 90%, 70%)',
          500: 'hsl(270, 85%, 60%)',
          600: 'hsl(262, 83%, 58%)',  // Primary violet
          700: 'hsl(262, 80%, 48%)',
          800: 'hsl(262, 75%, 38%)',
          900: 'hsl(262, 70%, 28%)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 hsl(262 83% 58% / 0.4)' },
          '70%': { boxShadow: '0 0 0 10px hsl(262 83% 58% / 0)' },
          '100%': { boxShadow: '0 0 0 0 hsl(262 83% 58% / 0)' },
        },
        'btn-glow': {
          '0%, 100%': { boxShadow: '0 4px 20px hsl(262 83% 58% / 0.35), 0 0 0 0 hsl(262 83% 58% / 0.2)' },
          '50%': { boxShadow: '0 8px 30px hsl(262 83% 58% / 0.55), 0 0 0 4px hsl(262 83% 58% / 0.1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'scale-in': 'scale-in 0.15s ease-out',
        shimmer: 'shimmer 1.5s infinite',
        'pulse-ring': 'pulse-ring 1.5s cubic-bezier(0.215, 0.610, 0.355, 1.000) infinite',
        'btn-glow': 'btn-glow 2s ease-in-out infinite',
      },
      backgroundImage: {
        'nova-gradient': 'linear-gradient(135deg, hsl(262, 83%, 58%), hsl(239, 84%, 67%), hsl(290, 70%, 55%))',
        'nova-gradient-soft': 'linear-gradient(135deg, hsl(262, 83%, 58% / 0.1), hsl(239, 84%, 67% / 0.1))',
        'shimmer-gradient': 'linear-gradient(90deg, transparent, hsl(var(--muted) / 0.5), transparent)',
      },
      boxShadow: {
        'nova-sm': '0 2px 8px hsl(262 83% 58% / 0.15)',
        nova: '0 4px 20px hsl(262 83% 58% / 0.25)',
        'nova-lg': '0 8px 40px hsl(262 83% 58% / 0.35)',
        'card-hover': '0 8px 30px hsl(0 0% 0% / 0.12)',
      },
    },
  },
  plugins: [],
};
