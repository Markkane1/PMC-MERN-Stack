/* eslint-disable no-undef */
module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:import/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
    "eslint-config-prettier",
  ],
  plugins: ["react-refresh"],
  settings: {
    react: {
      version: "detect",
    },
    "import/parsers": {
      "@typescript-eslint/parser": [".ts", ".tsx"] // use typescript-eslint parser for .ts|tsx files.
    },
    "import/resolver": {
      typescript: {
        project: "./tsconfig.eslint.json",
        alwaysTryTypes: true // always try to resolve types under `<root>@types` directory even it doesn't contain any source code, like `@types/unist`.
      }
    }
  },
  rules: {
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-expressions": "off",
    "@typescript-eslint/no-empty-object-type": "off",
    "import/no-unresolved": "off",
    "import/no-duplicates": "off",
    "react/jsx-key": "off",
    "no-constant-condition": "off",
    "react/no-unescaped-entities": "off",
    "react-hooks/rules-of-hooks": "off",
    "react-hooks/exhaustive-deps": "off",
    "react-refresh/only-export-components": [
      "off",
      { "allowConstantExport": true }
    ],
    "react/react-in-jsx-scope": "off",
    "import/first": "off",
    "import/default": "off",
    "import/newline-after-import": "off",
    "import/no-named-as-default-member": "off",
    "import/no-named-as-default": 0,
    "react/prop-types": "off",
    "react/jsx-sort-props": "off"
  },
};
