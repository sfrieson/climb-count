import js from "@eslint/js";
import globals from "globals";
import prettierConfig from "eslint-config-prettier";

export default [
  {
    files: ["src/**/*.js", "*.js"],
    ignores: ["models/**", "views/**", "controllers/**", "app.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2021,
        app: "readonly",
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...prettierConfig.rules,
      quotes: ["error", "double"],
      "no-unused-vars": [
        "warn",
        {
          args: "none",
          varsIgnorePattern: "^(app)$",
        },
      ],
      "no-undef": ["warn"],
    },
  },
  {
    files: ["eslint.config.js", "jest.config.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
    },
  },
  {
    files: [
      "tests/ClimbModel.test.js",
      "tests/RouteModel.test.js",
      "tests/basic-functionality.test.js",
      "tests/route-image.test.js",
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.jest,
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...prettierConfig.rules,
      quotes: ["error", "double"],
      "no-unused-vars": ["warn", { args: "none" }],
      "no-undef": ["warn"],
    },
  },
];
