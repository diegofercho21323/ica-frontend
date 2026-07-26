export default {
  forbidden: [
    // `severity` defaults to 'warn', and depcruise exits 0 on warnings. Every
    // rule below therefore needs an explicit 'error' to be able to fail a check.
    {
      name: 'shared-must-not-depend-on-higher-layers',
      severity: 'error',
      from: { path: '^src/shared' },
      to: { path: '^src/(features|pages|app)' },
    },
    {
      name: 'features-must-not-depend-on-pages-or-app',
      severity: 'error',
      from: { path: '^src/features' },
      to: { path: '^src/(pages|app)' },
    },
    {
      // The `$1` back-reference resolves to the capture group in `from.path`, so
      // a feature may import its own modules and only its own.
      name: 'features-must-not-depend-on-other-features',
      severity: 'error',
      from: { path: '^src/features/([^/]+)/' },
      to: { path: '^src/features/([^/]+)/', pathNot: '^src/features/$1/' },
    },
    {
      name: 'pages-must-not-depend-on-app',
      severity: 'error',
      from: { path: '^src/pages' },
      to: { path: '^src/app' },
    },
    {
      // Blind counting is enforced structurally: only recount authoring, and the
      // inventory adapter itself, may name a cost-leader projection. Anything
      // operator-facing cannot compile against a reconciled quantity. This rule
      // is only enforceable because the type sits in its own module, and only
      // catches `import type` edges because `tsPreCompilationDeps` is on.
      name: 'leader-view-is-recount-authoring-only',
      severity: 'error',
      from: {
        pathNot: '^(src/features/recount-authoring/|src/shared/api/inventory/)',
      },
      to: { path: '^src/shared/api/inventory/leader-models\\.ts$' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    // Without this, `import type` edges are absent from the graph entirely, so
    // any type-only layer violation passes every rule above silently.
    tsPreCompilationDeps: true,
  },
}
