const DEEPSEEK_CHAT_MODEL = process.env.DEEPSEEK_CHAT_MODEL || 'deepseek-chat';
const OPENAI_CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

function chatProvider() {
  if (DEEPSEEK_API_KEY) return 'deepseek';
  if (OPENAI_API_KEY) return 'openai';
  return null;
}

function chatModel() {
  return chatProvider() === 'deepseek' ? DEEPSEEK_CHAT_MODEL : OPENAI_CHAT_MODEL;
}

function chatApiKey() {
  return DEEPSEEK_API_KEY || OPENAI_API_KEY || null;
}

async function callChatCompletion(key, messages, { maxTokens = 900, temperature = 0.2 } = {}) {
  const provider = chatProvider();
  if (!provider) throw new Error('Add DEEPSEEK_API_KEY or OPENAI_API_KEY for transcription merge');
  const endpoint =
    provider === 'deepseek'
      ? 'https://api.deepseek.com/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

  const r = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: chatModel(),
      max_tokens: maxTokens,
      temperature,
      messages,
    }),
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(err || `${provider} error ${r.status}`);
  }
  const data = await r.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

export function voiceNoteMergeAvailable() {
  return Boolean(chatApiKey());
}

export function voiceNoteWhisperAvailable() {
  return Boolean(OPENAI_API_KEY);
}

export async function mergeVoiceNoteTranscript(priorTranscript, chunkText) {
  const key = chatApiKey();
  if (!key) throw new Error('Add DEEPSEEK_API_KEY or OPENAI_API_KEY for voice note transcription');
  const prior = String(priorTranscript || '').trim();
  const chunk = String(chunkText || '').trim();
  if (!chunk) return prior;

  const merged = await callChatCompletion(key, [
    {
      role: 'system',
      content: `You merge live voice-note dictation for a medical training game.
Given PRIOR transcript and a new RAW speech-to-text CHUNK, output the complete updated transcript.

Rules:
- Preserve the speaker's intent and wording; fix obvious STT errors and punctuation only.
- Do not invent clinical facts not spoken in PRIOR or CHUNK.
- Return ONLY the merged plain transcript — no markdown, labels, or commentary.`,
    },
    {
      role: 'user',
      content: `PRIOR:\n${prior || '(empty)'}\n\nNEW CHUNK:\n${chunk}\n\nMERGED TRANSCRIPT:`,
    },
  ]);

  return merged || `${prior}${prior ? ' ' : ''}${chunk}`.trim();
}

export async function transcribeAudioChunk(buffer, mimeType = 'audio/webm') {
  if (!OPENAI_API_KEY) return null;
  const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
  const blob = new Blob([buffer], { type: mimeType || 'audio/webm' });
  const form = new FormData();
  form.append('file', blob, `chunk.${ext}`);
  form.append('model', 'whisper-1');
  form.append('language', 'en');

  const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: form,
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(err || `Whisper error ${r.status}`);
  }
  const data = await r.json();
  return String(data.text || '').trim();
}
