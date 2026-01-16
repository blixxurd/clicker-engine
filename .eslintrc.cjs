module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ["./tsconfig.eslint.json"],
    sourceType: "module",
    ecmaVersion: "latest",
  },
  plugins: ["@typescript-eslint", "import"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "prettier",
  ],
  rules: {
    "@typescript-eslint/consistent-type-imports": "error",
    "@typescript-eslint/explicit-function-return-type": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "import/no-default-export": "error",
  },
  overrides: [
    {
      files: ["**/*config.ts", "vitest.config.ts"],
      rules: {
        "import/no-default-export": "off",
        "import/no-unresolved": "off",
      },
    },
  ],
  ignorePatterns: ["dist/**", "docs/**", "coverage/**", "examples/**/dist/**"],
};


