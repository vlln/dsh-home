/** dsh-home 双 half 构建：Node（esm）+ 官方 client bundle（cjs，__ModuleLoader__ 契约）。 */

export default [
  {
    entry: ['src/index.mjs'],
    format: 'esm',
    platform: 'node',
    target: 'es2024',
    outDir: 'lib',
    clean: true,
    // 官方包由 profile 闭包注入（$DSH_HOME/profiles/node_modules flat fallback）——
    // 不内联（本地 symlink 可解析时 tsdown 会误内联）。
    external: [/@deepseek-ai\//],
  },
  {
    name: '@vlln/dsh-home/client',
    entry: { client: 'src/client/index.tsx' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    define: { 'process.env.NODE_ENV': '"production"' },
    dts: false,
    clean: false,
    external: [/@deepseek-ai\/dsh-client-/, /^react(-dom)?($|\/)/],
    // Layout engine and its drag/resize dependencies ship inside this client half.
    noExternal: [
      /react-grid-layout/, /react-draggable/, /react-resizable/, /react-lifecycles-compat/,
      /resize-observer-polyfill/, /fast-equals/, /clsx/, /prop-types/, /react-is/, /object-assign/,
      // Vendored BoardUI components and their runtime.
      /^react-aria-components/, /^@react-aria\//, /^@react-stately\//, /^@internationalized\//,
      /^@remixicon\//, /^tailwind-merge/, /^@swc\/helpers/,
    ],
    outputOptions: {
      entryFileNames: 'client.js',
      banner: 'window.__ModuleLoader__.load({ id: "@vlln/dsh-home", factory: (require) => {',
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
]
