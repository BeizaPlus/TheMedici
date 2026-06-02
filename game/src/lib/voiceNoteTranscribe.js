const API = 'http://127.0.0.1:3001';

async function apiJson(path, options = {}) {
  const r = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `Request failed (${r.status})`);
  return data;
}

export async function mergeVoiceNoteChunk(priorTranscript, chunkText) {
  const data = await apiJson('/api/voice-note/merge', {
    method: 'POST',
    body: JSON.stringify({ priorTranscript, chunkText }),
  });
  return data.transcript || '';
}

export async function fetchVoiceNoteStatus() {
  try {
    const data = await apiJson('/api/voice-note/status');
    return { merge: Boolean(data.merge), whisper: Boolean(data.whisper) };
  } catch {
    return { merge: false, whisper: false };
  }
}

export async function transcribeVoiceNoteAudioChunk(blob, priorTranscript = '') {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  const audioBase64 = btoa(binary);
  const data = await apiJson('/api/voice-note/transcribe-chunk', {
    method: 'POST',
    body: JSON.stringify({
      audioBase64,
      mimeType: blob.type || 'audio/webm',
      priorTranscript,
    }),
  });
  return data.transcript || '';
}
