/**
 * Copy LongMan Atta lady character maps into game/public/assets/patient/ladies/.
 * Source: M:\Works\...\LongMan Atta\visuals\testimony-series\
 *
 * Usage: node scripts/sync-patient-lady-refs.mjs
 */
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_ROOT = path.join(__dirname, '..');
const LONGMAN =
  process.env.LONGMAN_ATTA_ROOT ||
  'M:/Works/Houdini Projects/TheMind_KOS/adobe/LongMan Atta/visuals/testimony-series';
const DEST = path.join(GAME_ROOT, 'public/assets/patient/ladies');

const COPIES = [
  ['characters/twa-polka-subject-CHARACTER-MAP.png', 'twa-polka-subject-CHARACTER-MAP.png'],
  ['characters/room-01-lady-99-CHARACTER-MAP.png', 'room-01-lady-99-CHARACTER-MAP.png'],
  ['characters-bank/maps/pinterest-outdoor-afro-CHARACTER-MAP.png', 'pinterest-outdoor-afro-CHARACTER-MAP.png'],
  ['characters-bank/maps/pinterest-cornrows-car-CHARACTER-MAP.png', 'pinterest-cornrows-car-CHARACTER-MAP.png'],
  ['characters-bank/maps/pinterest-polka-pajama-CHARACTER-MAP.png', 'pinterest-polka-pajama-CHARACTER-MAP.png'],
];

await fsp.mkdir(DEST, { recursive: true });
for (const [rel, name] of COPIES) {
  const src = path.join(LONGMAN, rel);
  const dst = path.join(DEST, name);
  await fsp.copyFile(src, dst);
  console.log('copied', name);
}
console.log('Done →', DEST);
