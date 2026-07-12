import next from "eslint-config-next"
import tseslint from "typescript-eslint"

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "public/**",
      "scripts/**",
    ],
  },
  ...next,
  {
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      // The view layer is now typed against lib/types.ts; keep it that way.
      "@typescript-eslint/no-explicit-any": "error",
      // React 19's new React-Compiler-oriented hook rules fire on idiomatic
      // patterns we rely on today (fetch-on-mount, the shadcn useIsMobile
      // media-query hook, a render-scoped running-balance accumulator) as well
      // as vendored shadcn/ui primitives. Keep them as advisory warnings so
      // they surface without blocking the build; revisit as a dedicated pass.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
    },
  },
]

export default eslintConfig
