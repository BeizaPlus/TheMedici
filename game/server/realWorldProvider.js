import { deepseekRealWorldAvailable, fetchRealWorldWithDeepSeek } from './deepseekRealWorld.js';
import {
  fetchRealWorldWithGemini,
  geminiRealWorldAvailable,
} from './geminiRealWorld.js';

/**
 * gemini (default when key set — Google Search grounding for stories + videos)
 * deepseek if REAL_WORLD_PROVIDER=deepseek or no GEMINI_API_KEY
 */
export function realWorldProvider() {
  const forced = String(process.env.REAL_WORLD_PROVIDER || '').toLowerCase();
  if (forced === 'gemini') return geminiRealWorldAvailable() ? 'gemini' : null;
  if (forced === 'deepseek') return deepseekRealWorldAvailable() ? 'deepseek' : null;
  if (geminiRealWorldAvailable()) return 'gemini';
  if (deepseekRealWorldAvailable()) return 'deepseek';
  return null;
}

export function realWorldAvailable() {
  return Boolean(realWorldProvider());
}

export async function fetchRealWorldStories(ctx) {
  const provider = realWorldProvider();
  if (provider === 'deepseek') return fetchRealWorldWithDeepSeek(ctx);
  if (provider === 'gemini') return fetchRealWorldWithGemini(ctx);
  throw new Error('Add DEEPSEEK_API_KEY to MeWorld/.env (preferred) or GEMINI_API_KEY');
}
