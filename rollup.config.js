import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import eslint from 'rollup-plugin-eslint';
import resolve from 'rollup-plugin-node-resolve';
import replace from 'rollup-plugin-replace';
import uglify from 'rollup-plugin-uglify';
import serve from 'rollup-plugin-serve';
import postcss from 'rollup-plugin-postcss';
import autoprefixer from 'autoprefixer';
const version = require('./package.json').version;
const fs = require("fs");
const archive_size = fs.statSync("./src/data/data.zip").size;

export default {
  input: 'src/scripts/main.js',
  output: {
    file: 'build/js/main.min.js',
    format: 'iife',
    name: 'App',
    sourcemap: 'inline',
  },
  plugins: [
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
      REGIOVIZ_VERSION: version,
      ZIP_SIZE: JSON.stringify(archive_size)
    }),
    (process.env.SERVE !== undefined && serve({
      port: 11111,
      contentBase: 'build',
    })),
    (process.env.NODE_ENV === 'production' && uglify()),
  ],
};
