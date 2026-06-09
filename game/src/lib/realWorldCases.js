import catalog from '../data/realWorldCases.json' with { type: 'json' };

const MAX = catalog.maxPerCase ?? 2;

function norm(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function scoreStory(story, { caseId, diagnosis, topic }) {
  let score = 0;
  const id = Number(caseId);
  const dx = norm(diagnosis);
  const top = norm(topic);

  if (story.match?.caseIds?.includes(id)) score += 100;

  for (const needle of story.match?.diagnoses || []) {
    const n = norm(needle);
    if (!n) continue;
    if (dx && (dx.includes(n) || n.includes(dx))) score += 40;
  }

  // Topic alone caused false matches (e.g. "nausea and vomiting" → TSS on unrelated cases).
  if (score > 0) {
    for (const needle of story.match?.topics || []) {
      const n = norm(needle);
      if (!n || !top) continue;
      if (top.includes(n) || n.includes(top)) score += 10;
    }
  }

  return score;
}

export function buildYouTubeSearchUrl({ diagnosis = '', topic = '', name = '' } = {}) {
  const parts = [name, diagnosis, topic, 'patient story documentary medical'].filter(Boolean);
  const q = encodeURIComponent(parts.join(' ').trim());
  return `https://www.youtube.com/results?search_query=${q}`;
}

/** Up to two real-world patient stories with optional YouTube embeds. */
export function getRealWorldStories({ caseId, diagnosis = '', topic = '' } = {}) {
  const stories = catalog.stories || [];
  const ranked = stories
    .map((story) => ({ story, score: scoreStory(story, { caseId, diagnosis, topic }) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  const picked = [];
  const seen = new Set();
  for (const { story } of ranked) {
    if (seen.has(story.id)) continue;
    seen.add(story.id);
    picked.push(story);
    if (picked.length >= MAX) break;
  }

  return {
    stories: picked,
    searchUrl: buildYouTubeSearchUrl({ diagnosis, topic }),
    hasCurated: picked.length > 0,
  };
}

export function youtubeEmbedUrl(youtubeId) {
  if (!youtubeId) return '';
  return `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1`;
}
