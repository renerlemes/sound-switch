import { build, context } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @type {import('esbuild').BuildOptions[]} */
export const targets = [
  { entryPoints: [path.join(root, 'src/main/index.ts')], outfile: path.join(root, 'dist/main/index.cjs') },
  { entryPoints: [path.join(root, 'src/preload/index.ts')], outfile: path.join(root, 'dist/preload/index.cjs') },
].map((target) => ({
  ...target,
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'cjs',
  external: ['electron'],
  sourcemap: true,
  logLevel: 'info',
}));

export async function watchAll(onRebuild) {
  const plugin = {
    name: 'notify',
    setup(build) {
      build.onEnd((result) => {
        if (result.errors.length === 0) onRebuild();
      });
    },
  };
  const contexts = await Promise.all(targets.map((target) => context({ ...target, plugins: [plugin] })));
  await Promise.all(contexts.map((item) => item.watch()));
  return contexts;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await Promise.all(targets.map((target) => build(target)));
}
