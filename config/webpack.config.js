var { dev, prod } = require('@ionic/app-scripts/config/webpack.config.js');

const path = require('path');
const webpackMerge = require('webpack-merge');
const CopyWebpackPlugin = require('copy-webpack-plugin')

const customConfig = {
  resolve: {
    alias: {
      '@app': path.resolve('src'),
    }
  },
  plugins: [
    new CopyWebpackPlugin([
      {
        from: './content-player/',
        to: './content-player',
        toType: 'file'
      }
    ]),
  ]
};

module.exports = function () {
  dev = webpackMerge(dev, customConfig);
  prod = webpackMerge(prod, customConfig);
  prod.devtool = 'source-map';
  return { dev, prod };
}
