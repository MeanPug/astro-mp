// Design tokens of the landing-page theme (Figma: Landing Page / Jacoby & Meyers).
// The WordPress theme keeps its own tailwind.config.js for the editor; the front-end is this file.
module.exports = {
    content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
    theme: {
        fontFamily: {
            heading: ['Poppins', 'sans-serif'],
            body: ['Montserrat', 'sans-serif'],
            sans: ['Montserrat', 'sans-serif'],
        },
        container: {
            center: true,
            padding: {
                DEFAULT: '1.25rem', // 20px
                lg: '2.5rem', // 40px
                xl: '5rem', // 80px, the Figma gutter at 1440
            },
            screens: {
                sm: '640px',
                md: '768px',
                lg: '1024px',
                xl: '1280px',
                '2xl': '1440px',
            },
        },
        extend: {
            colors: {
                red: {
                    DEFAULT: '#d0112b',
                    dark: '#ab1111',
                    deep: '#8a0d0d',
                    soft: '#f6dbe0',
                },
                blue: {
                    DEFAULT: '#185179',
                },
                ink: {
                    DEFAULT: '#1d1d1f', // headings on light
                    700: '#333333',
                    500: '#666666', // body copy
                    400: '#8a8f98',
                },
                line: {
                    DEFAULT: '#d5d7da',
                    light: '#e5e7eb',
                },
                label: '#414651',
                surface: {
                    DEFAULT: '#f2f2f2',
                    card: '#ffffff',
                    dark: '#0b0f14',
                },
            },
            fontSize: {
                '2xs': ['0.75rem', { lineHeight: '1rem' }],
                display: ['clamp(4.5rem, 12vw, 11rem)', { lineHeight: '0.95', letterSpacing: '-0.02em', fontWeight: '800' }],
                h1: ['clamp(2.25rem, 4vw, 3rem)', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '700' }],
                h2: ['clamp(1.75rem, 3vw, 2.25rem)', { lineHeight: '1.33', letterSpacing: '-0.02em', fontWeight: '700' }],
                h3: ['clamp(1.375rem, 2.2vw, 1.75rem)', { lineHeight: '1.3', fontWeight: '700' }],
                h4: ['1.25rem', { lineHeight: '1.4', fontWeight: '600' }],
                lead: ['1.125rem', { lineHeight: '1.5' }],
            },
            boxShadow: {
                xs: '0 1px 2px 0 rgba(10, 13, 18, 0.05)',
                card: '0 8px 24px rgba(10, 13, 18, 0.08)',
                form: '0 24px 60px rgba(0, 0, 0, 0.25)',
            },
            borderRadius: {
                input: '8px',
            },
            maxWidth: {
                content: '1280px',
            },
        },
    },
    plugins: [],
};
