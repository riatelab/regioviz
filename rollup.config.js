import babel from 'rollup-plugin-babel';
import cleaner from 'rollup-plugin-cleaner';
import commonjs from 'rollup-plugin-commonjs';
import copy from 'rollup-plugin-copy';
import eslint from 'rollup-plugin-eslint';
import resolve from 'rollup-plugin-node-resolve';
import replace from 'rollup-plugin-replace';
import uglify from 'rollup-plugin-uglify';
import serve from 'rollup-plugin-serve';
import postcss from 'rollup-plugin-postcss';
import autoprefixer from 'autoprefixer';
// import cssnano from 'cssnano';

export default {
  input: 'src/scripts/main.js',
  output: {
    file: 'build/js/main.min.js',
    format: 'iife',
    name: 'App',
    sourcemap: 'inline',
  },
  plugins: [
    cleaner({
      targets: ['./build/'],
    }),
    copy({
      "src/index.html": "build/index.html",
      "src/img/favicon.ico": "build/favicon.ico",
      "src/img": "build/img",
      "src/data": "build/data",
      "src/vendor": "build/vendor",
    verbose: true
    }),
    resolve({
      jsnext: true,
      main: true,
      browser: true,
    }),
    commonjs(),
    eslint({
      exclude: [
        'src/styles/**',
      ],
    }),
    postcss({
      plugins: [autoprefixer()], // [autoprefixer(), cssnano()],
      sourceMap: 'inline',
      extensions: ['.css'],
    }),
    babel({
      exclude: 'node_modules/**',
    }),
    replace({
      exclude: 'node_modules/**',
      ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
    }),
    (process.env.SERVE !== undefined && serve({
      port: 11111,
      contentBase: 'build',
    })),
    (process.env.NODE_ENV === 'production' && uglify()),
  ],
};
