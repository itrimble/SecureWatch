import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        // Splunk-inspired font stack - prioritizes system fonts used by Splunk
        sans: [
          "Splunk Platform Sans", // Splunk's proprietary font if available
          "Helvetica Neue",       // Primary Splunk font
          "Helvetica",            // Fallback
          "Arial",                // Standard fallback
          "system-ui",            // System default
          "-apple-system",        // macOS system font
          "BlinkMacSystemFont",   // Windows system font
          "Segoe UI",             // Modern Windows
          "Roboto",               // Android/Chrome OS
          "sans-serif",           // Ultimate fallback
        ],
        // Splunk uses specific fonts for code/data display
        mono: [
          "Splunk Platform Mono", // Splunk's monospace if available
          "SF Mono",              // macOS monospace
          "Monaco",               // macOS fallback
          "Cascadia Code",        // Windows modern mono
          "Roboto Mono",          // Google's mono
          "Menlo",                // macOS terminal
          "Consolas",             // Windows console
          "Liberation Mono",      // Linux
          "Courier New",          // Universal fallback
          "monospace",            // Ultimate fallback
        ],
        // Splunk UI specific font stack
        ui: [
          "Splunk Platform UI",   // If available
          "Helvetica Neue",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Splunk-specific colors
        splunk: {
          navy: "hsl(var(--splunk-navy))",
          "light-blue": "hsl(var(--splunk-light-blue))",
          green: "hsl(var(--splunk-green))",
          red: "hsl(var(--splunk-red))",
          amber: "hsl(var(--splunk-amber))",
        },
        // SIEM Alert colors
        alert: {
          critical: "hsl(var(--alert-critical))",
          "critical-bg": "hsl(var(--alert-critical-bg))",
          high: "hsl(var(--alert-high))",
          "high-bg": "hsl(var(--alert-high-bg))",
          medium: "hsl(var(--alert-medium))",
          "medium-bg": "hsl(var(--alert-medium-bg))",
          low: "hsl(var(--alert-low))",
          "low-bg": "hsl(var(--alert-low-bg))",
          success: "hsl(var(--alert-success))",
          "success-bg": "hsl(var(--alert-success-bg))",
          investigation: "hsl(var(--alert-investigation))",
          "investigation-bg": "hsl(var(--alert-investigation-bg))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
