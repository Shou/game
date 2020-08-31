const path = require("path")
const HtmlWebpackPlugin = require("html-webpack-plugin")
const MiniCssExtractPlugin = require("mini-css-extract-plugin")

module.exports = {
  devtool: "inline-source-map",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.(png)$/i,
        use: [
          {
            loader: "file-loader",
          },
        ],
      },
      {
        test: /\.css$/i,
        use: [
          MiniCssExtractPlugin.loader,
          "css-loader"
        ],
      },
    ],
  },
  resolve: {
    extensions: [ ".tsx", ".ts", ".js", ".json", ".txt" ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: "Game",
    }),
    new MiniCssExtractPlugin(),
  ],
  devServer: {
    contentBase: path.join(__dirname, "dist"),
    index: path.join(__dirname, "dist", "index.html"),
    compress: true,
    port: 9000,
    hot: true,
    disableHostCheck: true,
  },
};
