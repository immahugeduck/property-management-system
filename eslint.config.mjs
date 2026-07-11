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
      // Tightened to "error" in a follow-up once the view layer is fully typed.
      "@typescript-eslint/no-explicit-any": "warn",
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
