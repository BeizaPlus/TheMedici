/**
 * Meshy Image → 3D for ECG Vector Lab boy torso.
 * Requires MESHY_API_KEY in game/.env (Meshy Pro+).
 *
 * Run from game/:  node scripts/meshy-boy-image-to-3d.mjs
 * Optional:        node scripts/meshy-boy-image-to-3d.mjs --plate b
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'ecg-vector-lab', 'character');

dotenv.config({ path: path.join(ROOT, '.env') });
dotenv.config({ path: path.join(ROOT, '..', '.env'), override: true });

const API_KEY = process.env.MESHY_API_KEY?.trim();
const plateArg = process.argv.find((a) => a.startsWith('--plate='))?.split('=')[1]
  || (process.argv.includes('--plate') ? process.argv[process.argv.indexOf('--plate') + 1] : 'a');
const plate = String(plateArg || 'a').toLowerCase() === 'b' ? 'b' : 'a';
const IMAGE_PATH = path.join(OUT_DIR, `boy-ecg-placement-plate-${plate}.png`);
const OUT_GLB = path.join(OUT_DIR, 'boy.glb');

const BASE = 'https://api.meshy.ai/openapi/v1/image-to-3d';

function die(msg) {
  console.error(msg);
  process.exit(1);
}

if (!API_KEY) {
  die('Set MESHY_API_KEY= in game/.env (Meshy → API → create key).');
}
if (!fs.existsSync(IMAGE_PATH)) {
  die(`Missing plate: ${IMAGE_PATH}`);
}

function toDataUri(filePath) {
  const buf = fs.readFileSync(filePath);
  return `data:image/png;base64,${buf.toString('base64')}`;
}

async function meshyFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`Meshy ${res.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

async function pollTask(taskId) {
  const started = Date.now();
  while (true) {
    const task = await meshyFetch(`${BASE}/${taskId}`);
    const status = task.status || task.task_status;
    const pct = task.progress ?? task.progress_percent;
    process.stdout.write(`\r  status=${status}${pct != null ? ` ${pct}%` : ''}   `);
    if (status === 'SUCCEEDED') {
      console.log('');
      return task;
    }
    if (status === 'FAILED' || status === 'CANCELED') {
      console.log('');
      throw new Error(`Task ${status}: ${JSON.stringify(task)}`);
    }
    if (Date.now() - started > 30 * 60 * 1000) {
      throw new Error('Timed out after 30 minutes');
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status}: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
}

async function main() {
  console.log(`Plate: ${path.basename(IMAGE_PATH)}`);
  console.log('Encoding image (base64 data URI)…');
  const image_url = toDataUri(IMAGE_PATH);

  console.log('Creating Meshy image-to-3d task…');
  const create = await meshyFetch(BASE, {
    method: 'POST',
    body: JSON.stringify({
      image_url,
      ai_model: 'latest',
      should_texture: true,
      enable_pbr: false,
      should_remesh: true,
      topology: 'triangle',
      target_polycount: 80000,
      pose_mode: 'a-pose',
      image_enhancement: false,
      target_formats: ['glb'],
      texture_prompt:
        'Young male medical training manikin torso, bare chest, subtle rib cage, neutral skin tone, no electrodes, no wires, educational anatomy',
    }),
  });

  const taskId = create.result || create.id || create.task_id;
  if (!taskId) die(`Unexpected create response: ${JSON.stringify(create)}`);
  console.log(`Task id: ${taskId}`);
  console.log('Polling (usually several minutes)…');

  const task = await pollTask(taskId);
  const glbUrl = task.model_urls?.glb || task.result?.model_urls?.glb;
  if (!glbUrl) {
    die(`No GLB in response: ${JSON.stringify(task.model_urls || task)}`);
  }

  console.log(`Downloading → ${OUT_GLB}`);
  await download(glbUrl, OUT_GLB);
  console.log('Done. Say "wire 3D mode" to hook boy.glb into ecg-vector-lab.html.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
