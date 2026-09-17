// Same pipeline as the WordPress theme's webpack build (webpack/webpack.config.js),
// so the stylesheets copied from theme/assets/css compile unchanged.
module.exports = {
    plugins: [
        require('postcss-import'),
        require('tailwindcss/nesting'),
        require('tailwindcss'),
        require('autoprefixer'),
        require('postcss-nested'),
    ],
};
