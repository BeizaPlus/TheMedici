import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// This file lives at `game/src/lib/sceneCameraLock.js`.
// We need the project root (`game/`) to reach `game/dev/scene-camera-lock/SCENE_LOCK.json`.
const gameRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const lockPath = path.join(gameRoot, 'dev/scene-camera-lock/SCENE_LOCK.json');

/** @type {import('../../dev/scene-camera-lock/SCENE_LOCK.json')} */
export const SCENE_CAMERA_LOCK = JSON.parse(readFileSync(lockPath, 'utf8'));

export function getCameraLockPrompt(variant = 'openai') {
  const prompts = SCENE_CAMERA_LOCK.prompts || {};
  return prompts[variant] || prompts.openai || prompts.short || '';
}

export function getLandscapeFramePrompt(variant = 'magnific') {
  const { width, height } = SCENE_CAMERA_LOCK.exportPixels;
  return `Landscape 16:9 wide cinematic frame (output will be cropped to ${width}x${height}). Patient centered on ED stretcher, full body crown through toes slightly zoomed out; monitor upper-right and IV fluids upper-left; same central overhead bedside composition as reference crop lock. ${getCameraLockPrompt(variant)}`;
}

export function getCropLockRelPath(sex = 'male') {
  const key = sex === 'female' ? 'female' : 'male';
  return SCENE_CAMERA_LOCK.cropLock?.[key]?.path || null;
}

export function getBaseplateRelPath(sex = 'male') {
  const key = sex === 'female' ? 'female' : 'male';
  return SCENE_CAMERA_LOCK.baseplates[key]?.path || 'public/assets/patient/patient-scene.png';
}

export function getBaseplateAbsPath(sex = 'male') {
  return path.join(gameRoot, getBaseplateRelPath(sex));
}
