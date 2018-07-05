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
const glob = require('glob');
const fs = require("fs");
const get_datasets_info = () => {
  const datasets = {};
  const found = glob.GlobSync('./src/data*/data.zip').found;
  found.forEach((path) => {
    const name = path.indexOf('data_') > -1
      ? path.replace('./src/data_', '').replace('/data.zip', '')
      : path.replace('./src/data', '').replace('/data.zip', '');
    const size = fs.statSync(path).size;
    const _default = found.length === 1 ? true
      : glob.GlobSync(path.replace('data.zip', '.default')).found.length === 1
        ? true : false;
    datasets[name] = { size, default: _default };
  });
  return datasets;
};

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
      DATASET_NAME_SIZE: JSON.stringify(get_datasets_info())
    }),
    (process.env.SERVE !== undefined && serve({
      port: 11111,
      contentBase: 'build',
    })),
    (process.env.NODE_ENV === 'production' && uglify()),
  ],
};
