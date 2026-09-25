// eslint.config.js  (ESLint v9 flat config — CommonJS format)
"use strict";

const browserAndExtensionGlobals = {
  // Standard browser
  window: "readonly",
  document: "readonly",
  navigator: "readonly",
  console: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  setInterval: "readonly",
  clearInterval: "readonly",
  Promise: "readonly",
  crypto: "readonly",
  URL: "readonly",
  Event: "readonly",
  KeyboardEvent: "readonly",
  ClipboardEvent: "readonly",
  DataTransfer: "readonly",
  MutationObserver: "readonly",
  alert: "readonly",
  confirm: "readonly",
  // Dual-export guard: `if (typeof module !== 'undefined' && module.exports)`
  module: "readonly",
  // Chrome extension APIs
  chrome: "readonly",
  self: "readonly",
  importScripts: "readonly",
  // Extension namespace globals set by our own scripts
  ChatHandoff: "readonly",
  ChatHandoffDom: "readonly",
  ChatHandoffStorage: "readonly",
  ChatHandoffOrchestrator: "readonly",
  ChatHandoffComponents: "readonly",
};

const nodeGlobals = {
  require: "readonly",
  module: "readonly",
  exports: "readonly",
  __dirname: "readonly",
  __filename: "readonly",
  process: "readonly",
  console: "readonly",
  Buffer: "readonly",
};

/** @type {import("eslint").Linter.FlatConfig[]} */
module.exports = [
  // ---- Extension source files (browser + Chrome extension context) ----------
  {
    files: [
      "background/**/*.js",
      "content-scripts/**/*.js",
      "popup/**/*.js",
      "options/**/*.js",
      "storage/**/*.js",
      "shared/*.js",
    ],
    languageOptions: {
      ecmaVersion: 2022,
      // Extension scripts are loaded as classic scripts (not ES modules), so
      // top-level function declarations are the natural pattern — not globals leaks.
      sourceType: "script",
      globals: browserAndExtensionGlobals,
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "eqeqeq": ["error", "always"],
      "no-var": "error",
      "prefer-const": "error",
      // Top-level function declarations are the intended pattern for
      // script-mode files loaded by <script> tags or importScripts().
      "no-implicit-globals": "off",
    },
  },

  // ---- Unit + shared tests --------------------------------------------------
  {
    files: ["shared/tests/**/*.js", "tests/unit/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: nodeGlobals,
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-console": "off",
      "prefer-const": "error",
      "no-var": "error",
    },
  },

  // ---- E2e tests -----------------------------------------------------------
  {
    files: ["tests/e2e/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: nodeGlobals,
    },
    rules: {
      "no-console": "off",
      "prefer-const": "error",
      "no-var": "error",
    },
  },

  // ---- Ignored paths -------------------------------------------------------
  {
    ignores: ["node_modules/**", "dist/**"],
  },
];
