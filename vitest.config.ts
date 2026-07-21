import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    // Resolve the "@/*" path alias from tsconfig natively (no plugin needed).
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
    // `server-only` throws by design when imported outside a React Server
    // Component bundle. Stub it so the server modules under test can load.
    alias: {
      "server-only": new URL("./test/stubs/server-only.ts", import.meta.url).pathname,
    },
  },
})
