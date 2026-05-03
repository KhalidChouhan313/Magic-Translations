import { defineConfig } from "tsup";

export default defineConfig([
  // CLI + core — CommonJS
  {
    entry: {
      cli: "src/cli.ts",
      index: "src/index.ts",
      init: "src/init.ts",
      scanner: "src/scanner.ts",
      translator: "src/translator.ts",
    },
    format: ["cjs"],
    dts: true,
    sourcemap: true,
    clean: false,
    outDir: "dist",
  },
  // React — ESM + CJS dono
  {
    entry: {
      "react/index": "src/react/index.ts",
    },
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
    outDir: "dist",
    esbuildOptions(options) {
      options.jsx = "automatic";
    },
    external: ["react", "react-dom"],
  },
]);