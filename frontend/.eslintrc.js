/* eslint-env node */

module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true, // Penting agar require/module dikenali
  },
  extends: ["eslint:recommended", "plugin:react/recommended"],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["react"],
  rules: {
    // Tambahkan aturan ESLint opsional di sini
  },
  settings: {
    react: {
      version: "detect",
    },
  },
};
