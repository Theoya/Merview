const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/** @type {import('esbuild').Plugin} */
const esbuildProblemMatcherPlugin = {
  name: 'esbuild-problem-matcher',
  setup(build) {
    build.onStart(() => {
      console.log('[build] started');
    });
    build.onEnd(result => {
      result.errors.forEach(({ text, location }) => {
        console.error(`[ERROR] ${text}`);
        if (location) {
          console.error(`    ${location.file}:${location.line}:${location.column}:`);
        }
      });
      console.log('[build] finished');
    });
  }
};

const sharedOptions = {
  bundle: true,
  minify: production,
  sourcemap: !production,
  sourcesContent: false,
  platform: 'node',
  target: 'node18',
  logLevel: 'warning',
  plugins: [esbuildProblemMatcherPlugin],
};

async function main() {
  const extCtx = await esbuild.context({
    ...sharedOptions,
    entryPoints: ['src/extension.ts'],
    outfile: 'dist/extension.js',
    format: 'cjs',
    external: ['vscode'],
  });

  const cliCtx = await esbuild.context({
    ...sharedOptions,
    entryPoints: ['src/cli.ts'],
    outfile: 'dist/cli.js',
    format: 'cjs',
    banner: { js: '#!/usr/bin/env node' },
    external: ['electron'],
  });

  const electronMainCtx = await esbuild.context({
    ...sharedOptions,
    entryPoints: ['src/electron/main.ts'],
    outfile: 'dist/electron/main.js',
    format: 'cjs',
    external: ['electron'],
  });

  const electronPreloadCtx = await esbuild.context({
    ...sharedOptions,
    entryPoints: ['src/electron/preload.ts'],
    outfile: 'dist/electron/preload.js',
    format: 'cjs',
    external: ['electron'],
  });

  const contexts = [extCtx, cliCtx, electronMainCtx, electronPreloadCtx];

  if (watch) {
    await Promise.all(contexts.map(ctx => ctx.watch()));
  } else {
    await Promise.all(contexts.map(ctx => ctx.rebuild()));
    await Promise.all(contexts.map(ctx => ctx.dispose()));
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
