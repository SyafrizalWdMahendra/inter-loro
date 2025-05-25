// import App from './src/scripts/index.js';
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const WebpackPwaManifest = require("webpack-pwa-manifest");
const WorkboxWebpackPlugin = require("workbox-webpack-plugin");

module.exports = {
  // 1. Mode and Entry
  mode: "development", // Change to 'production' for final build
  entry: {
    main: "./src/scripts/app.js",
  },

  // 2. Output
  output: {
    filename: "[name].[contenthash].js",
    path: path.resolve(__dirname, "docs"),
    publicPath: "/",
  },

  // 3. Loaders
  module: {
    rules: [
      // CSS Loader
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      // Asset Loader
      {
        test: /\.(png|svg|jpg|jpeg|gif|woff|woff2)$/,
        type: "asset/resource",
        generator: {
          filename: "assets/[hash][ext][query]",
        },
      },
    ],
  },

  // 4. Plugins
  plugins: [
    new CleanWebpackPlugin(),

    new HtmlWebpackPlugin({
      template: "./src/index.html",
      inject: "body",
      favicon: "./src/scripts/icons/reading-book.png",
      minify: {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
      },
    }),

    // Generate manifest.json
    new WebpackPwaManifest({
      name: "Story Share",
      short_name: "StoryShare",
      description: "Share your stories with the world",
      start_url: "/index.html",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#ffffff",
      inject: true,
      fingerprints: false,
      icons: [
        {
          src: path.resolve("src/scripts/icons/reading-book.png"),
          sizes: [72, 96, 128, 144, 152, 192, 384, 512],
          destination: path.join("icons"),
          ios: true,
        },
        {
          src: path.resolve("src/scripts/icons/icon-book.png"),
          sizes: [152],
          destination: path.join("icons"),
        },
        {
          src: path.resolve("src/scripts/icons/check.png"),
          sizes: [192],
          destination: path.join("icons"),
        },
        {
          src: path.resolve("src/scripts/icons/download.png"),
          sizes: [512],
          destination: path.join("icons"),
        },
      ],
    }),

    // Copy static assets
    new CopyWebpackPlugin({
      patterns: [
        {
          from: "./src/scripts/service-worker.js",
          to: "service-worker.js",
        },
        {
          from: "./src/scripts/icons",
          to: "icons",
        },
        {
          from: path.resolve(__dirname, "./src/styles/"),
          to: path.resolve(__dirname, "docs/"),
        },
      ],
    }),

    // Service worker and offline support
    new WorkboxWebpackPlugin.InjectManifest({
      swSrc: "./src/scripts/service-worker.js",
      swDest: "service-worker.js",
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
      exclude: [/\.map$/, /_redirect/],
    }),
  ],

  // 5. Dev Server
  devServer: {
    static: {
      directory: path.join(__dirname, "docs"),
    },
    hot: true,
    port: 3000,
    open: true,
    historyApiFallback: true, // Required for PWA routing
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
    },
    devMiddleware: {
      writeToDisk: true, // Write files to disk for better debugging
    },
  },

  // 6. Optimization
  optimization: {
    runtimeChunk: "single",
    splitChunks: {
      chunks: "all",
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendors",
          chunks: "all",
        },
      },
    },
  },

  // 7. Resolve
  resolve: {
    alias: {
      "@models": path.resolve(__dirname, "src/scripts/models"),
      "@views": path.resolve(__dirname, "src/scripts/views"),
      "@assets": path.resolve(__dirname, "src/assets"),
    },
    extensions: [".js", ".json"],
  },

  // 8. Performance
  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  },
};
