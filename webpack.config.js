const path = require("path");
const merge = require("webpack-merge");
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin")


const base = {
  mode: "production",
  target: "web",
  node: {
    __dirname: false,
    __filename: false,
  },
  module: {
    rules: [],
  },
  resolve: {
    extensions: [".js"],
  },
  plugins: [
    new NodePolyfillPlugin()
  ]
};


function makeConfig(filename) {
  return merge.merge(base, {
    name: filename,
    entry: `./${filename}.js`,
    output: {
      filename: `${filename}.js`,
      path: path.resolve(__dirname, "build"),
      library: 'garlicore',
      libraryTarget: 'umd',
      umdNamedDefine: true
    },
    devtool: false,
    optimization: {
      minimize: true
    }
  });
}

module.exports = [makeConfig("garlic_wallet_lite")];