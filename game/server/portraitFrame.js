import fsp from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { resolvePortraitSex } from '../src/lib/portraitSex.js';

/** Canonical play viewport frame — see `dev/scene-camera-lock/SCENE_LOCK.json`. */
export const BASEPLATE_WIDTH = 1536;
export const BASEPLATE_HEIGHT = 864;
export const PORTRAIT_FRAME_VERSION = 2;

const BASEPLATE_FILES = {
  male: 'public/assets/patient/patient-scene.png',
  female: 'public/assets/patient/patient-scene-female.png',
};

export function baseplateRelPath(sex = 'male') {
  return sex === 'female' ? BASEPLATE_FILES.female : BASEPLATE_FILES.male;
}

export async function readBaseplateBuffer(gameRoot, caseContext = {}) {
  const sex = resolvePortraitSex(caseContext);
  const rel = baseplateRelPath(sex);
  const abs = path.join(gameRoot, rel);
  const buf = await fsp.readFile(abs);
  return { buffer: buf, mimeType: 'image/png', relPath: rel, sex };
}

/** Resize/crop any PNG to the approved 16:9 baseplate dimensions. */
export async function fitToBaseplate(buffer) {
  return sharp(buffer)
    .resize(BASEPLATE_WIDTH, BASEPLATE_HEIGHT, {
      fit: 'cover',
      position: 'centre',
    })
    .png()
    .toBuffer();
}

export async function bufferToBase64(buffer) {
  return buffer.toString('base64');
}
