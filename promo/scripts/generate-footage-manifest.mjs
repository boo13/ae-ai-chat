import {access, mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const footageDir = path.join(root, 'public', 'footage');
const output = path.join(root, 'src', 'footage-manifest.generated.ts');
const filenames = ['ae-panel-run.mp4', 'output-1.mp4', 'output-2.mp4'];

await mkdir(footageDir, {recursive: true});

const entries = await Promise.all(
  filenames.map(async (filename) => {
    try {
      await access(path.join(footageDir, filename));
      return [filename, true];
    } catch {
      return [filename, false];
    }
  }),
);

const manifest = Object.fromEntries(entries);
await writeFile(
  output,
  `export const footageManifest = ${JSON.stringify(manifest, null, 2)} as const;\n`,
);

const present = entries.filter(([, exists]) => exists).length;
process.stdout.write(`Footage manifest: ${present}/${filenames.length} clips present.\n`);
