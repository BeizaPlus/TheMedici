import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fitToBaseplate } from '../server/portraitFrame.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'docs/portrait-previews');

const urls = [
  [
    'https://pikaso.cdnpk.net/private/production/4636127979/render.png?token=exp=1782000000~hmac=db3221e7272ad01c51989b016659050afef864fafdc941342731ee161715ed7c',
    'ped-female-a',
  ],
  [
    'https://pikaso.cdnpk.net/private/production/4636127682/render.png?token=exp=1782000000~hmac=1c86548a509e79b7426dc1ef27e68e7356e1279c80eb6519b1c63df1726eaf2d',
    'ped-female-b',
  ],
];

for (const [url, tag] of urls) {
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  await fsp.writeFile(path.join(outDir, `case-${tag}-preview.png`), buf);
  const fitted = await fitToBaseplate(buf);
  await fsp.writeFile(path.join(outDir, `case-${tag}-preview-1536.png`), fitted);
  console.log(tag, buf.length, 'fitted', fitted.length);
}

const winner = await fsp.readFile(path.join(outDir, 'case-ped-female-a-preview-1536.png'));
await fsp.writeFile(path.join(root, 'public/assets/patient/patient-scene-ped-female.png'), winner);
console.log('promoted public/assets/patient/patient-scene-ped-female.png');
