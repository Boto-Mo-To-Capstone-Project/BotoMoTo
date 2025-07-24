import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // 🟡 Warnings instead of errors
      "no-unused-vars": ["warn", { args: "none", ignoreRestSiblings: true }],
      "@typescript-eslint/no-unused-vars": ["warn", { args: "none" }],

      // 🟢 Allow temporary use of `any` — good for early dev
      "@typescript-eslint/no-explicit-any": "warn",

      // 🔵 You may want to turn this off during early dev
      "react/no-unescaped-entities": "off",

      // 🟢 Allow use of <img> if not optimizing yet
      "@next/next/no-img-element": "off",

      // 🔵 Allow vars like `let` for readability
      "prefer-const": "warn",

      // 🔵 Turn off empty interface rule if needed
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
];

export default eslintConfig;
