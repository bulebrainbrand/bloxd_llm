import { defineConfig } from "@bloxdjs/build";
export default defineConfig({
  includes: ["./src/**/*.ts"],
  worldcode: {
    entry: "./src/index.ts",
  },
  minify: {
    enable: false,
  },
  debug: true,
});
