import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        'unbounded': ['Unbounded', 'system-ui', 'sans-serif'],
        'rajdhani': ['Rajdhani', 'Inter', 'system-ui', 'sans-serif'],
        'mono': ['Space Mono', 'JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
