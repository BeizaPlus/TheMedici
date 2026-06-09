const API =
  typeof window !== 'undefined' && window.location?.hostname
    ? ''
    : 'http://127.0.0.1:3001';

/** Real-world patient stories for a CCS case (DeepSeek default; Gemini optional). */
export async function fetchGeminiRealWorld({
  caseId,
  topic = '',
  diagnosis = '',
  chiefComplaint = '',
  hpiSnippet = '',
  refresh = false,
  repairVideos = true,
} = {}) {
  const r = await fetch(`${API}/api/differential/real-world`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      caseId,
      topic,
      diagnosis,
      chiefComplaint,
      hpiSnippet,
      refresh,
      repairVideos,
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(data.error || 'Could not fetch real-world cases');
  }
  return data;
}
