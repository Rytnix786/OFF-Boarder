import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/static-components": "warn",
      "react/no-unescaped-entities": "warn",
      "prefer-const": "warn",
      "@typescript-eslint/no-non-null-asserted-optional-chain": "warn",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The frontend/ subdirectory is a separate project with its own config
    "frontend/**",
    // Project-specific generated/dev utility files not part of app lint scope
    "node_modules/**",
    "dist/**",
    "scripts/**",
    "examples/**",
    "skills/**",
    "check_*.js",
    "check-*.js",
    "test-*.js",
    "test*.js",
    "test-prisma.ts",
  ]),
]);

export default eslintConfig;
