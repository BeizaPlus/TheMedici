import yts from 'yt-search';
import { youtubeVideoAvailable } from './youtubeUtils.js';

const MEDICAL_HINT =
  /patient|medical|disease|syndrome|documentary|hospital|diagnos|condition|rare|health|doctor|icu|emergency/i;

function storyText(ctx) {
  return `${ctx.headline || ''} ${ctx.summary || ''}`.toLowerCase();
}

function conditionQueries(ctx) {
  const text = storyText(ctx);
  const out = [];
  if (/hereditary angioedema|\bhae\b/i.test(text)) {
    out.push('hereditary angioedema patient story documentary');
    out.push('HAE patient interview');
  }
  if (/hsp vasculitis|henoch|schönlein|schonlein/i.test(text)) {
    out.push('Henoch Schonlein purpura patient story');
    out.push('HSP vasculitis patient documentary');
  }
  if (/toxic shock|tss\b/i.test(text)) {
    out.push('toxic shock syndrome patient story documentary');
  }
  if (/necrotizing fasciitis|flesh eating/i.test(text)) {
    out.push('necrotizing fasciitis patient story documentary');
  }
  return out;
}

function buildQueries({ patientName = '', diagnosis = '', topic = '', headline = '', summary = '' } = {}) {
  const out = [...conditionQueries({ headline, summary, diagnosis, topic })];
  const name = String(patientName).trim();
  const dx = String(diagnosis).trim();
  const top = String(topic).trim();

  if (dx) out.push(`${dx} patient story documentary`);
  if (name && dx) out.push(`${name} ${dx} patient`);
  if (name) out.push(`${name} patient story medical documentary`);
  if (name && top) out.push(`${name} ${top} patient`);

  return [...new Set(out.filter(Boolean))].slice(0, 6);
}

function storyConditionTags(ctx) {
  const text = storyText(ctx);
  const tags = new Set();
  if (/hereditary angioedema|\bhae\b/i.test(text)) tags.add('hae');
  if (/hsp vasculitis|henoch|schönlein|schonlein/i.test(text)) tags.add('hsp');
  if (/toxic shock|\btss\b/i.test(text)) tags.add('tss');
  if (/necrotizing fasciitis|flesh eating/i.test(text)) tags.add('nf');
  return tags;
}

function videoMatchesStoryCondition(title, ctx) {
  const t = String(title || '').toLowerCase();
  const tags = storyConditionTags(ctx);
  if (!tags.size) return true;

  const has = {
    hae: /angioedema|\bhae\b/i.test(t),
    hsp: /vasculitis|purpura|\bhsp\b|henoch/i.test(t),
    tss: /toxic shock|\btss\b/i.test(t),
    nf: /necrotizing|flesh eating|fasciitis/i.test(t),
  };

  if (tags.has('hae') && !tags.has('hsp')) return has.hae || (!has.hsp && MEDICAL_HINT.test(t));
  if (tags.has('hsp') && !tags.has('hae')) return has.hsp || (!has.hae && MEDICAL_HINT.test(t));
  if (tags.has('tss')) return has.tss || MEDICAL_HINT.test(t);
  if (tags.has('nf')) return has.nf || MEDICAL_HINT.test(t);
  return true;
}

function videoRelevanceScore(title, ctx) {
  const t = String(title || '').toLowerCase();
  const text = storyText(ctx);
  let score = 0;

  if (!videoMatchesStoryCondition(title, ctx)) return -10;

  if (MEDICAL_HINT.test(t)) score += 2;
  else score -= 3;

  const dx = String(ctx.diagnosis || '').toLowerCase();
  if (dx) {
    for (const word of dx.split(/\s+/).filter((w) => w.length > 4)) {
      if (t.includes(word)) score += 2;
    }
  }

  for (const token of ['angioedema', 'hae', 'vasculitis', 'purpura', 'toxic shock', 'sepsis', 'abdomen']) {
    if (text.includes(token) && t.includes(token)) score += 4;
  }

  const name = String(ctx.patientName || '').trim();
  if (name) {
    const parts = name.toLowerCase().split(/\s+/).filter((p) => p.length > 2);
    const last = parts[parts.length - 1];
    if (last && t.includes(last)) {
      score += MEDICAL_HINT.test(t) ? 3 : -6;
    }
    if (t.includes(name.toLowerCase())) score += 4;
  }

  if (/\b(baseball|mlb|nba|nfl|audition|promo|highlights)\b/i.test(t)) score -= 8;
  if (/#housemd|#series\b|house md clip|fictional patient/i.test(t)) score -= 12;

  return score;
}

export function isRelevantMedicalVideo(title, ctx = {}) {
  return videoRelevanceScore(title, ctx) >= 2;
}

/** Find embeddable YouTube videos via search (no API key). oEmbed-validated. */
export async function searchWorkingYouTubeVideos(ctx = {}, max = 2) {
  const queries = buildQueries(ctx);
  const candidates = [];
  const seen = new Set();

  for (const query of queries) {
    try {
      const result = await yts(query);
      for (const row of result?.videos || []) {
        const id = String(row?.videoId || '').trim();
        if (!id || seen.has(id)) continue;
        seen.add(id);
        const title = String(row?.title || 'YouTube').trim();
        const score = videoRelevanceScore(title, ctx);
        if (score < 2) continue;
        candidates.push({
          title,
          url: row?.url || `https://www.youtube.com/watch?v=${id}`,
          youtubeId: id,
          score,
        });
      }
    } catch (err) {
      console.warn('[youtube-search]', query, err?.message || err);
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const found = [];

  for (const row of candidates) {
    if (found.length >= max) break;
    if (!(await youtubeVideoAvailable(row.youtubeId))) continue;
    found.push({
      title: row.title,
      url: row.url,
      youtubeId: row.youtubeId,
    });
  }

  return found;
}
