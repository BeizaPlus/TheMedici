import fsp from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { resolvePatientSceneKey } from '../src/lib/patientSceneKey.js';

/** Canonical play viewport frame — see `dev/scene-camera-lock/SCENE_LOCK.json`. */
export const BASEPLATE_WIDTH = 1536;
export const BASEPLATE_HEIGHT = 864;
export const PORTRAIT_FRAME_VERSION = 3;

const BASEPLATE_FILES = {
  male: 'public/assets/patient/patient-scene.png',
  female: 'public/assets/patient/patient-scene-female.png',
  pedMale: 'public/assets/patient/patient-scene-ped-male.png',
  pedFemale: 'public/assets/patient/patient-scene-ped-female.png',
};

export function baseplateRelPath(sceneKey = 'male') {
  return BASEPLATE_FILES[sceneKey] || BASEPLATE_FILES.male;
}

export async function readBaseplateBuffer(gameRoot, caseContext = {}) {
  const sceneKey = resolvePatientSceneKey(caseContext);
  const rel = baseplateRelPath(sceneKey);
  const abs = path.join(gameRoot, rel);
  try {
    const buf = await fsp.readFile(abs);
    return { buffer: buf, mimeType: 'image/png', relPath: rel, sex: sceneKey };
  } catch {
    const fallbackKey = sceneKey.startsWith('ped') ? 'male' : sceneKey === 'female' ? 'female' : 'male';
    const fallbackRel = baseplateRelPath(fallbackKey);
    const fallbackAbs = path.join(gameRoot, fallbackRel);
    const buf = await fsp.readFile(fallbackAbs);
    return { buffer: buf, mimeType: 'image/png', relPath: fallbackRel, sex: fallbackKey };
  }
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
