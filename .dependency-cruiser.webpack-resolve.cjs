/**
 * Alias resolution for dependency-cruiser, referenced from
 * .dependency-cruiser.cjs via `options.webpackConfig`.
 *
 * Not a real webpack config - dependency-cruiser only reads the `resolve`
 * key out of whatever file this points to. Kept separate from tsConfig-based
 * resolution deliberately: dependency-cruiser 18.2.0's TypeScript-project
 * path resolution silently fails to resolve `~`/`~~` aliases against this
 * repo's TypeScript 6.0.3 install (verified empirically - every aliased
 * import came back `couldNotResolve: true` despite .nuxt/tsconfig.json's
 * `paths` block being correct), so aliases are declared directly here
 * instead of relying on tsConfig at all.
 */
const path = require("node:path");

module.exports = {
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "app"),
      "@": path.resolve(__dirname, "app"),
      "~~": __dirname,
      "@@": __dirname
    },
    extensions: [".ts", ".vue", ".js", ".mjs", ".json"]
  }
};
