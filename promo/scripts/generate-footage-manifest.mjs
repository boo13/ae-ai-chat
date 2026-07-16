import {access, mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const footageDir = path.join(root, 'public', 'footage');
const audioDir = path.join(root, 'public', 'audio');
const footageOutput = path.join(root, 'src', 'footage-manifest.generated.ts');
const audioOutput = path.join(root, 'src', 'audio-manifest.generated.ts');
const footageFilenames = [
  'ae-panel-run.mp4',
  'panel-autofix.mp4',
  'broadcast-lower-third.mp4',
  'scifi-radar-hud.mp4',
  'kinetic-typography-slam.mp4',
  'rain-on-glass.mp4',
  'neon-sign-flicker.mp4',
  'texturelabs-filmdamage.mp4',
];
const audioFilenames = [
  'track.mp3',
  'sfx-type.mp3',
  'sfx-send.mp3',
  'sfx-swish.mp3',
  'sfx-sting.mp3',
];

await mkdir(footageDir, {recursive: true});
await mkdir(audioDir, {recursive: true});

const buildManifest = async (directory, filenames) => {
  return Promise.all(
    filenames.map(async (filename) => {
      try {
        await access(path.join(directory, filename));
        return [filename, true];
      } catch {
        return [filename, false];
      }
    }),
  );
};

const writeManifest = async (output, exportName, entries) => {
  const manifest = Object.fromEntries(entries);
  await writeFile(
    output,
    `export const ${exportName} = ${JSON.stringify(manifest, null, 2)} as const;\n`,
  );
};

const footageEntries = await buildManifest(footageDir, footageFilenames);
const audioEntries = await buildManifest(audioDir, audioFilenames);

await writeManifest(footageOutput, 'footageManifest', footageEntries);
await writeManifest(audioOutput, 'audioManifest', audioEntries);

const footagePresent = footageEntries.filter(([, exists]) => exists).length;
const audioPresent = audioEntries.filter(([, exists]) => exists).length;
process.stdout.write(
  `Footage manifest: ${footagePresent}/${footageFilenames.length} clips present. Audio manifest: ${audioPresent}/${audioFilenames.length} files present.\n`,
);
