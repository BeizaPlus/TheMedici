import uberRefs from '../data/patientUberRefs.json' with { type: 'json' };
import { isUberCase } from './uberCases.js';

const SHIPPED_GAME_SCENE_STATUSES = new Set(['approved', 'approved-pending-ship']);

/** Tier A — case browser / picker hero plate (shipped GAME-SCENE in public/). */
export function resolveUberCasePreviewScene(caseContext = {}) {
  const ref = resolvePatientUberRef(caseContext);
  if (!ref?.gameSceneUrl) return null;
  if (!SHIPPED_GAME_SCENE_STATUSES.has(ref.gameSceneStatus)) return null;
  return {
    slug: ref.slug,
    caseId: ref.caseId,
    url: ref.gameSceneUrl,
    file: ref.gameSceneFile,
    status: ref.gameSceneStatus,
  };
}

/** Unique-face ref for Uber composite cases (U01–U08).
 *  Tier A (preview): gameSceneFile → public/assets/patient/uber/<slug>-GAME-SCENE.png
 *  Tier B (in-case): character map publicUrl + buildPortraitPrompt() style lock
 *  Trace copy: game-scenes-pending/<slug>-GAME-SCENE-altN-approved-pending-ship.png */
export function resolvePatientUberRef(caseContext = {}) {
  const caseId = String(caseContext?.id ?? caseContext?.ccsNumber ?? '').trim();
  if (!isUberCase(caseId)) return null;

  const slug =
    caseContext?.uberFaceSlug ||
    uberRefs.caseSlugs?.[caseId] ||
    null;
  if (!slug) return null;

  if ((uberRefs.excludedSlugs || []).includes(slug)) return null;

  const entry = uberRefs.refs?.[slug];
  if (!entry || entry.status === 'excluded') return null;

  const assetBase = uberRefs.assetBase || '/assets/patient/uber';
  const mapFile = entry.mapFile || `${slug}-CHARACTER-MAP.png`;
  const gameSceneFile = entry.gameSceneFile || null;
  const gameSceneStatus = entry.gameSceneStatus || null;

  return {
    slug,
    caseId,
    label: entry.label || slug,
    sex: entry.sex || null,
    sourceFile: entry.sourceFile || null,
    devSourcePath: entry.sourceFile
      ? `${uberRefs.devSourceDir}/${entry.sourceFile}`
      : null,
    file: mapFile,
    publicUrl: `${assetBase}/${mapFile}`,
    gameSceneFile,
    gameSceneStatus,
    gameSceneAlt: entry.gameSceneAlt || null,
    gameSceneUrl: gameSceneFile ? `${assetBase}/${gameSceneFile}` : null,
    identityPrompt: entry.identityPrompt || '',
    status: entry.status || 'source-packaged',
  };
}
