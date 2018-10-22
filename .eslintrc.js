module.exports = {
  env: { browser: true },
  extends: "airbnb-base",
  rules: {
    "linebreak-style": ["error", "windows"],
    "linebreak-style": ["error", "unix"],
    "no-bitwise": 0
  },
  plugins: ["import"]
};
