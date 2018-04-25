const webpack = require('webpack');
const path    = require('path');

const plugins = [
  // compressing
  new webpack.optimize.OccurrenceOrderPlugin(),
  // compressing
  new webpack.optimize.AggressiveMergingPlugin()
];

module.exports = (env, argv) => {
  const mode = process.env.NODE_ENV || process.env.WEBPACK_ENV || argv.mode || 'development';

  return {
    mode: mode,
    entry: {
      index: path.join(__dirname, 'src', 'index.ts'),
    },

    output: {
      path: path.join(__dirname, 'lib'),
      filename: (mode === 'production')
        ? '::PROJECT_NAME::.min.js'
        : '::PROJECT_NAME::.js',
      library: '::PROJECT_NAME::',
      libraryTarget: 'umd'
    },

    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: [
            { loader: 'ts-loader' }
          ]
        }
      ]
    },

    resolve: {
      extensions: ['.ts'],
      modules: [
        "node_modules"
      ]
    },

    node: {
      fs: 'empty'
    },

    devtool: (mode === 'production') ? false : 'source-map',
    plugins: plugins
  }
};
