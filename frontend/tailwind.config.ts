import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "class",
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#1d73c9",
                "primary-hover": "#155fa0",
                "primary-light": "#e8f2fb",
                "background-light": "#F9F9F8",
                "background-dark": "#111921",
                "border-soft": "#E5E5E5",
                "text-main": "#2D2D2D",
                "text-secondary": "#6B7280",
            },
            fontFamily: {
                display: ["'Tiempos Headline'", "Georgia", "serif"],
                sans: ["Inter", "sans-serif"],
            },
            borderRadius: {
                DEFAULT: "0.5rem",
                md: "0.75rem",
                lg: "1rem",
                xl: "1.5rem",
                "2xl": "2rem",
                full: "9999px",
            },
            boxShadow: {
                xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                sm: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
                DEFAULT: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
                xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
                "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
                premium: "0 20px 50px -12px rgba(0, 0, 0, 0.08)",
            },
            animation: {
                "fade-in": "fadeIn 0.5s ease-in-out",
                "slide-up": "slideUp 0.4s ease-out",
                "scale-in": "scaleIn 0.3s ease-out",
                spin: "spin 1s linear infinite",
            },
            keyframes: {
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                slideUp: {
                    "0%": { transform: "translateY(10px)", opacity: "0" },
                    "100%": { transform: "translateY(0)", opacity: "1" },
                },
                scaleIn: {
                    "0%": { transform: "scale(0.95)", opacity: "0" },
                    "100%": { transform: "scale(1)", opacity: "1" },
                },
            },
        },
    },
    plugins: [],
};

export default config;
