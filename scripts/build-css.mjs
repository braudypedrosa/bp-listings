import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { compileAsync } from 'sass-embedded';

const packageRoot = resolve(import.meta.dirname, '..');
const stylesEntry = resolve(packageRoot, 'listings-map.scss');
const outputPath = resolve(packageRoot, 'listings-map.css');
const bpuiStyleCandidates = [
  resolve(packageRoot, 'node_modules/@braudypedrosa/bp-ui-components/dist/styles/index.css'),
  resolve(packageRoot, '../bp-ui-components/dist/styles/index.css'),
];

async function readFirstAvailable(paths) {
  for (const candidate of paths) {
    try {
      return await readFile(candidate, 'utf8');
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        continue;
      }
      throw error;
    }
  }

  throw new Error('Unable to locate bp-ui-components compiled styles.');
}

const [bpuiStyles, compiledResult] = await Promise.all([
  readFirstAvailable(bpuiStyleCandidates),
  compileAsync(stylesEntry, {
    style: 'expanded',
    loadPaths: [packageRoot],
  }),
]);

const output = [bpuiStyles.trim(), compiledResult.css.trim()]
  .filter(Boolean)
  .join('\n\n');

await writeFile(outputPath, `${output}\n`);
