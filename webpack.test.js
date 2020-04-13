
const path = require("path")
const config = require("./webpack.config.js")

module.exports = Object.assign(config, {
  entry: "./src/index.test.ts",
  output: {
    filename: "test.js",
    path: path.resolve(__dirname, "dist"),
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
