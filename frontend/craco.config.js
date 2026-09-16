const path = require("path");

module.exports = {
  eslint: {
    enable: true,
  },
  jest: {
    configure: {
      moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
    },
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
