/**
 * Download YouTube interview segments + extract interval + scene-change frames.
 *
 *   node scripts/extract-interview-frames.mjs
 *   node scripts/extract-interview-frames.mjs --video=CXKCoFz3WRs --segments=2300-2500
 *   node scripts/extract-interview-frames.mjs --segments=2300-2500,600-900,1800-2100
 *   node scripts/extract-interview-frames.mjs --url=https://youtu.be/CXKCoFz3WRs --start=2300 --end=2500
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const DEFAULT_VIDEO = 'CXKCoFz3WRs';
const DEFAULT_SEGMENTS = ['2300-2500', '600-900', '1800-2100'];
const INTERVAL_SEC = 2;
const SCENE_THRESHOLD = 0.28;

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : fallback;
}

function parseVideoId(urlOrId) {
  const raw = String(urlOrId || DEFAULT_VIDEO);
  const m =
    raw.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ||
    raw.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/) ||
    raw.match(/^([a-zA-Z0-9_-]{11})$/);
  return m ? m[1] : raw;
}

function resolveSegments() {
  const start = arg('start', null);
  const end = arg('end', null);
  if (start != null && end != null) {
    return parseSegments(`${start}-${end}`);
  }
  return parseSegments(arg('segments', null));
}

function parseSegments(raw) {
  return String(raw || DEFAULT_SEGMENTS.join(','))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pair) => {
      const [a, b] = pair.split('-').map(Number);
      if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) {
        throw new Error(`Bad segment "${pair}" — use START-END seconds`);
      }
      return { start: a, end: b, label: `segment_${a}-${b}` };
    });
}

function run(cmd, opts = {}) {
  return execSync(cmd, {
    stdio: opts.quiet ? 'pipe' : 'inherit',
    encoding: 'utf8',
    shell: true,
    ...opts,
  });
}

function hasCmd(name) {
  try {
    run(`where ${name}`, { quiet: true });
    return true;
  } catch {
    return false;
  }
}

function ensureDirs(base) {
  for (const sub of ['video', 'frames/interval', 'frames/scenes', 'angles', 'meta']) {
    fs.mkdirSync(path.join(base, sub), { recursive: true });
  }
}

/** Cut segment via yt-dlp URL + ffmpeg (faster than --download-sections on long videos). */
function downloadSegment(videoId, seg, outDir) {
  const outMp4 = path.join(outDir, `${seg.label}.mp4`);
  const duration = seg.end - seg.start;

  if (fs.existsSync(outMp4) && fs.statSync(outMp4).size > 500_000) {
    console.log('skip download — exists', outMp4);
    return outMp4;
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  console.log(`Cutting ${videoId} ${seg.start}s–${seg.end}s via ffmpeg …`);

  const streamUrl = run(
    `yt-dlp --no-update -f "best[height<=720]/best" -g "${url}"`,
    { quiet: true },
  )
    .trim()
    .split('\n')[0]
    .trim();

  if (!streamUrl) throw new Error('yt-dlp did not return stream URL');

  run(
    [
      'ffmpeg', '-y',
      '-ss', String(seg.start),
      '-t', String(duration),
      '-i', `"${streamUrl}"`,
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
      '-c:a', 'aac', '-b:a', '128k',
      `"${outMp4}"`,
    ].join(' '),
  );

  if (!fs.existsSync(outMp4) || fs.statSync(outMp4).size < 100_000) {
    throw new Error(`Segment export failed: ${outMp4}`);
  }
  return outMp4;
}

function extractIntervalFrames(mp4, seg, intervalDir) {
  fs.mkdirSync(intervalDir, { recursive: true });
  const pattern = path.join(intervalDir, `${seg.label}_abs%05d.png`);
  run(
    [
      'ffmpeg', '-y', '-i', `"${mp4}"`,
      '-vf', `fps=1/${INTERVAL_SEC}`,
      '-q:v', '2',
      `"${pattern.replace(/\\/g, '/')}"`,
    ].join(' '),
    { quiet: true },
  );

  // Rename with absolute timestamps
  const files = fs.readdirSync(intervalDir).filter((f) => f.endsWith('.png')).sort();
  files.forEach((f, i) => {
    const absSec = seg.start + i * INTERVAL_SEC;
    const next = `${seg.label}_abs${String(absSec).padStart(5, '0')}s.png`;
    const from = path.join(intervalDir, f);
    const to = path.join(intervalDir, next);
    if (from !== to) {
      if (fs.existsSync(to)) fs.unlinkSync(to);
      fs.renameSync(from, to);
    }
  });
  return files.length;
}

function extractSceneFrames(mp4, seg, sceneDir) {
  fs.mkdirSync(sceneDir, { recursive: true });
  const pattern = path.join(sceneDir, `${seg.label}_scene_%03d.png`);
  run(
    [
      'ffmpeg', '-y', '-i', `"${mp4}"`,
      '-vf', `select='gt(scene,${SCENE_THRESHOLD})',showinfo`,
      '-vsync', 'vfr',
      '-q:v', '2',
      `"${pattern}"`,
    ].join(' '),
    { quiet: true },
  );

  const scenes = fs.readdirSync(sceneDir)
    .filter((f) => f.startsWith(`${seg.label}_scene_`) && f.endsWith('.png'))
    .sort();
  const span = seg.end - seg.start;
  scenes.forEach((f, i) => {
    const approxAbs = seg.start + Math.round((i * span) / Math.max(scenes.length, 1));
    const next = `${seg.label}_scene_abs${String(approxAbs).padStart(5, '0')}s.png`;
    const from = path.join(sceneDir, f);
    const to = path.join(sceneDir, next);
    if (fs.existsSync(to)) fs.unlinkSync(to);
    fs.renameSync(from, to);
  });
  return scenes.length;
}

async function main() {
  if (!hasCmd('yt-dlp') || !hasCmd('ffmpeg')) {
    console.error('Requires yt-dlp and ffmpeg on PATH');
    process.exit(1);
  }

  const urlArg = arg('url', null);
  const videoId = parseVideoId(urlArg || arg('video', DEFAULT_VIDEO));
  const segments = resolveSegments();
  const base = path.join(root, 'dev', 'tv-presentations', 'interview-ref', videoId);
  const videoDir = path.join(base, 'video');
  ensureDirs(base);

  let title = videoId;
  try {
    title = run(`yt-dlp --no-update --print "%(title)s" "https://www.youtube.com/watch?v=${videoId}"`, {
      quiet: true,
    }).trim();
  } catch {
    /* ignore */
  }

  const manifestPath = path.join(base, 'meta', 'manifest.json');
  let manifest = {
    videoId,
    title,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    steveAnchorSec: 2326,
    extractedAt: new Date().toISOString(),
    segments: [],
  };
  if (fs.existsSync(manifestPath)) {
    try {
      const prev = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      manifest.segments = prev.segments || [];
    } catch {
      /* ignore */
    }
  }
  manifest.videoId = videoId;
  manifest.title = title;
  manifest.extractedAt = new Date().toISOString();
  manifest.segments = manifest.segments.filter((s) => !segments.some((n) => n.label === s.label));

  for (const seg of segments) {
    const mp4 = downloadSegment(videoId, seg, videoDir);
    const intervalDir = path.join(base, 'frames', 'interval', seg.label);
    const sceneDir = path.join(base, 'frames', 'scenes', seg.label);
    const intervalCount = extractIntervalFrames(mp4, seg, intervalDir);
    const sceneCount = extractSceneFrames(mp4, seg, sceneDir);
    manifest.segments.push({
      ...seg,
      mp4: path.relative(base, mp4),
      intervalFrames: intervalCount,
      sceneFrames: sceneCount,
    });
    console.log(`${seg.label}: ${intervalCount} interval, ${sceneCount} scene frames`);
  }

  fs.writeFileSync(path.join(base, 'meta', 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log('Done →', base);
  console.log('Next: node scripts/pick-interview-angles.mjs');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
