/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './hooks/**/*.{js,ts,jsx,tsx,mdx}',
        './*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                dark: '#020204',
                card: '#0a0a0f',
                accent: '#6366f1',
                secondary: '#a855f7',
                tertiary: '#ec4899',
            },
            fontFamily: {
                sans: ['Tajawal', 'Cairo', 'sans-serif'],
                tajawal: ['Tajawal', 'sans-serif'],
                cairo: ['Cairo', 'sans-serif'],
            },
            borderRadius: {
                '4xl': '2rem',
                '5xl': '3rem',
            },
        },
    },
    plugins: [],
};
