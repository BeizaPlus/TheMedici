import { searchWorkingYouTubeVideos } from './youtubeSearchRepair.js';

const DEEPSEEK_API_KEY = () => process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_CHAT_MODEL || 'deepseek-chat';

export function deepseekRealWorldAvailable() {
  return Boolean(DEEPSEEK_API_KEY());
}

function buildPrompt({ caseId, topic, diagnosis, chiefComplaint, hpiSnippet }) {
  return `You are helping a medical student find REAL documented patient cases for a USMLE Step 3 CCS practice case.

CCS Case ${caseId}
Topic / presentation: ${topic || '—'}
Diagnosis: ${diagnosis || '—'}
Chief complaint: ${chiefComplaint || '—'}
Clinical context: ${(hpiSnippet || '').slice(0, 600)}

Requirements:
- Return EXACTLY 2 distinct real stories (not fictional).
- Story 1 — tier "direct": a documented patient whose condition matches this CCS diagnosis/presentation (news, hospital feature, medical documentary).
- Story 2 — tier "adjacent": a broader REAL public story that teaches AROUND the topic (e.g. Michael Phelps on post-Olympic depression for a drowning case; organ-donor story for sepsis). Public figures OK when the teaching link is explicit in the headline.
- Each story: what happened, key medical teaching point, organism/etiology if known.
- Prefer famous direct teaching cases when they exist (e.g. Alex Lewis for strep TSS, Lauren Wasser for tampon-related TSS).
- Do NOT include video URLs — text only.
- Only use cases you are confident are real public stories.

Return JSON only:
{
  "stories": [
    {
      "id": "kebab-case-slug",
      "tier": "direct",
      "name": "Full name",
      "headline": "One line",
      "summary": "2-5 sentences"
    },
    {
      "id": "adjacent-slug",
      "tier": "adjacent",
      "name": "Full name",
      "headline": "One line — teaching angle around the topic",
      "summary": "2-5 sentences"
    }
  ]
}`;
}

function normalizeStory(raw, index) {
  const tier = raw?.tier === 'adjacent' ? 'adjacent' : 'direct';
  return {
    id: String(raw?.id || `deepseek-${index + 1}`).trim(),
    tier,
    name: String(raw?.name || 'Unknown patient').trim(),
    headline: String(raw?.headline || '').trim(),
    summary: String(raw?.summary || '').trim(),
    videos: [],
    source: 'deepseek',
  };
}

function parseStoriesFromText(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const block = String(text).match(/\{[\s\S]*\}/);
    if (!block) return [];
    parsed = JSON.parse(block[0]);
  }
  const list = Array.isArray(parsed?.stories) ? parsed.stories : [];
  return list.map(normalizeStory).filter((s) => s.name && s.summary).slice(0, 2);
}

async function attachYouTubeVideos(stories, ctx) {
  const out = [];
  for (const story of stories) {
    const videos = await searchWorkingYouTubeVideos(
      {
        patientName: story.name,
        headline: story.headline,
        summary: story.summary,
        diagnosis: story.tier === 'adjacent' ? ctx.diagnosis : story.headline || ctx.diagnosis,
        topic: ctx.topic,
        tier: story.tier || 'direct',
        ccsDiagnosis: ctx.diagnosis,
      },
      2,
    );
    out.push({ ...story, videos });
  }
  return out;
}

export async function fetchRealWorldWithDeepSeek(ctx) {
  if (!DEEPSEEK_API_KEY()) {
    throw new Error('Add DEEPSEEK_API_KEY to MeWorld/.env');
  }

  const r = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY()}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      max_tokens: 1200,
      temperature: 0.35,
      messages: [
        {
          role: 'system',
          content: 'Return valid JSON only. Real documented medical patient cases.',
        },
        { role: 'user', content: buildPrompt(ctx) },
      ],
    }),
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = data?.error?.message || `DeepSeek HTTP ${r.status}`;
    throw new Error(msg);
  }

  const text = data?.choices?.[0]?.message?.content || '';
  const stories = parseStoriesFromText(text);
  const withVideos = await attachYouTubeVideos(stories, ctx);

  return {
    stories: withVideos,
    model: DEEPSEEK_MODEL,
    provider: 'deepseek',
    webSearchQueries: [
      ctx.diagnosis ? `${ctx.diagnosis} patient story` : '',
      ctx.topic ? `${ctx.topic} real patient case` : '',
    ].filter(Boolean),
    groundingChunks: [],
  };
}
