module.exports = [
"[turbopack-node]/transforms/postcss.ts { CONFIG => \"[project]/claude-projects/edgeless-website/postcss.config.mjs [postcss] (ecmascript)\" } [postcss] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "chunks/01sj_0xk4jgl._.js",
  "chunks/[root-of-the-server]__0emtsp4._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[turbopack-node]/transforms/postcss.ts { CONFIG => \"[project]/claude-projects/edgeless-website/postcss.config.mjs [postcss] (ecmascript)\" } [postcss] (ecmascript)");
    });
});
}),
];