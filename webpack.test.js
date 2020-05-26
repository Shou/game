const path = require("path")
const config = require("./webpack.common.js")

module.exports = Object.assign(config, {
  entry: "./test/index.ts",
  output: {
    filename: "test.js",
    path: path.resolve(__dirname, "dist-test"),
  },
  target: "node",
  module: Object.assign(config.module, {
    rules: [
      ...config.module.rules,
      {
        test: /\.node$/,
        use: "node-loader",
      }
    ],
  }),
})
