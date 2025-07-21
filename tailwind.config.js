/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'primary-blue': '#2C3E50',
                'primary-gold': '#F1C40F',
                'secondary-sky': '#3498DB',
                'secondary-silver': '#BDC3C7',
                'accent-green': '#2ECC71',
                'accent-coral': '#E74C3C',
                'dark-bg': '#1e293b',
                'dark-card': '#2c3a4f',
                'dark-border': '#475569',
            },
            fontFamily: {
                'sans': ['Open Sans', 'sans-serif'],
                'heading': ['Montserrat', 'sans-serif'],
            }
        },
    },
    plugins: [],
}