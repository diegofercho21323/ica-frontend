export default {
  forbidden: [
    {
      name: 'shared-must-not-depend-on-higher-layers',
      from: { path: '^src/shared' },
      to: { path: '^src/(features|pages|app)' },
    },
    {
      name: 'features-must-not-depend-on-pages-or-app',
      from: { path: '^src/features' },
      to: { path: '^src/(pages|app)' },
    },
    {
      name: 'pages-must-not-depend-on-app',
      from: { path: '^src/pages' },
      to: { path: '^src/app' },
    },
  ],
  options: { doNotFollow: { path: 'node_modules' } },
}
