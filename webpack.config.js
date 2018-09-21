const path = require('path');

module.exports = {
  entry: './lib/lc-client.js',
  output: {
    filename: 'build.js',
    path: path.resolve(__dirname, 'dist')
  }
};