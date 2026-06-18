import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

function normalizeCaseFile(caseId) {
  const num = String(caseId || '').replace(/^case_/i, '').trim();
  return num ? `case_${num.padStart(3, '0')}` : null;
}

export function caseStoryCachePath(cacheDir, caseId) {
  const slug = normalizeCaseFile(caseId);
  return slug ? path.join(cacheDir, `${slug}.json`) : null;
}

export function caseStoryImagePath(cacheDir, caseId) {
  const slug = normalizeCaseFile(caseId);
  return slug ? path.join(cacheDir, `${slug}-master.png`) : null;
}

export function caseStoryBeatImagePath(cacheDir, caseId, beatId) {
  const slug = normalizeCaseFile(caseId);
  const bid = String(beatId || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '');
  if (!slug || !bid) return null;
  return path.join(cacheDir, `${slug}-beat-${bid}.png`);
}

export function caseStoryBeatImageSlug(caseId, beatId) {
  const file = caseStoryBeatImagePath('/tmp', caseId, beatId);
  return file ? path.basename(file) : null;
}

export async function readCaseStoryCache(cacheDir, caseId, { promptVersion } = {}) {
  const file = caseStoryCachePath(cacheDir, caseId);
  if (!file || !fs.existsSync(file)) return null;
  try {
    const doc = JSON.parse(await fsp.readFile(file, 'utf8'));
    if (
      promptVersion != null
      && doc?.promptVersion != null
      && doc.promptVersion !== promptVersion
    ) {
      return null;
    }
    return doc;
  } catch {
    return null;
  }
}

export async function writeCaseStoryCache(cacheDir, caseId, payload, { promptVersion } = {}) {
  const slug = normalizeCaseFile(caseId);
  if (!slug || !payload) return null;
  await fsp.mkdir(cacheDir, { recursive: true });
  const file = caseStoryCachePath(cacheDir, slug);
  const doc = {
    caseId: slug,
    ...payload,
    ...(promptVersion != null ? { promptVersion } : {}),
    cachedAt: new Date().toISOString(),
  };
  await fsp.writeFile(file, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
  return doc;
}
