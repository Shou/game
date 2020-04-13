const path = require("path")
const config = require("./webpack.common.js")

module.exports = Object.assign(config, {
  entry: "./src/index.tsx",
  module: {
    rules: [
      ...config.module.rules.slice(1),
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules|\.test\.tsx?/,
      },
    ],
  },
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
  },
})
