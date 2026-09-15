const path = require("path");

module.exports = {
  eslint: {
    enable: true,
  },
  webpack: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  devServer: (config) => {
    config.historyApiFallback = true;
    return config;
  },
};
