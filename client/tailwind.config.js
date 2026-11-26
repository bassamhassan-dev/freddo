/** @type {import('tailwindcss').Config} */
// Freddo's neon identity (from the approved UI mock): neon amber on
// near-black brown. Colors are HSL channels in CSS variables so opacity
// modifiers like bg-primary/10 keep working (the shadcn pattern).
import tailwindcssAnimate from 'tailwindcss-animate';

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        card: 'hsl(var(--card) / <alpha-value>)',
        'card-foreground': 'hsl(var(--card-foreground) / <alpha-value>)',
        primary: 'hsl(var(--primary) / <alpha-value>)',
        'primary-foreground': 'hsl(var(--primary-foreground) / <alpha-value>)',
        secondary: 'hsl(var(--secondary) / <alpha-value>)',
        'secondary-foreground': 'hsl(var(--secondary-foreground) / <alpha-value>)',
        muted: 'hsl(var(--muted) / <alpha-value>)',
        'muted-foreground': 'hsl(var(--muted-foreground) / <alpha-value>)',
        accent: 'hsl(var(--accent) / <alpha-value>)',
        'accent-foreground': 'hsl(var(--accent-foreground) / <alpha-value>)',
        destructive: 'hsl(var(--destructive) / <alpha-value>)',
        'destructive-foreground': 'hsl(var(--destructive-foreground) / <alpha-value>)',
        border: 'hsl(var(--border) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 8px)',
      },
      fontFamily: {
        sans: ['Cairo', 'Tajawal', 'Segoe UI', 'system-ui', 'sans-serif'],
        brand: ['Impact', 'Arial Narrow', 'Arial Black', 'sans-serif'],
      },
      boxShadow: {
        neon: '0 0 22px rgba(255, 160, 20, 0.55)',
        'neon-sm': '0 0 14px rgba(255, 140, 0, 0.18)',
        'neon-card': '0 0 18px rgba(255, 140, 0, 0.08)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
