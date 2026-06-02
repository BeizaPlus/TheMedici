/**
 * Single-environment paths — everything under game/
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const GAME_ROOT = path.join(__dirname, '..');
export const DATA_ROOT = path.join(GAME_ROOT, 'data');
export const CASE_BANK_DIR = path.join(DATA_ROOT, 'cases');
export const CASE_BANK_MASTER = path.join(DATA_ROOT, 'ccs_cases_master.json');
export const OLLAMA_CASES_JSON = path.join(DATA_ROOT, 'ollama', 'cases.json');
export const CCS_SCREENSHOTS_DIR = path.join(GAME_ROOT, 'ccs_screenshots');
export const CCS_PRESENTATIONS_DIR = path.join(DATA_ROOT, 'ccs_presentations');
export const STEP3_TOOLS_DIR = path.join(GAME_ROOT, 'step3');
export const PREPARED_CASES_PATH = path.join(GAME_ROOT, 'src/data/preparedCases.json');
export const CCS_CATALOG_PATH = path.join(GAME_ROOT, 'src/data/ccsCatalog.json');

export function ensureDataDirs() {
  for (const dir of [DATA_ROOT, CASE_BANK_DIR, path.dirname(OLLAMA_CASES_JSON), CCS_PRESENTATIONS_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
