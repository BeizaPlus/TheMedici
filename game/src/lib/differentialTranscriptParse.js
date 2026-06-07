/** Browser uses same-origin /api (Vite proxy in dev). */
const API =
  typeof window !== 'undefined' && window.location?.hostname
    ? ''
    : 'http://127.0.0.1:3001';

/**
 * Send raw speech transcript to DeepSeek (or OpenAI fallback) for cleanup + diagnosis list.
 */
export async function parseDifferentialTranscript({
  rawTranscript,
  topic,
  caseId,
  final = false,
}) {
  const r = await fetch(`${API}/api/differential/parse-transcript`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rawTranscript,
      topic,
      caseId,
      final,
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(data.error || 'Could not parse transcript');
  }
  return {
    cleanedTranscript: data.cleanedTranscript || '',
    diagnoses: Array.isArray(data.diagnoses) ? data.diagnoses : [],
    provider: data.provider || null,
  };
}
