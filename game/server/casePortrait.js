import fsp from 'fs/promises';
import path from 'path';

export function normalizeCaseId(caseId) {
  const s = String(caseId || '').trim();
  if (!s) return null;
  const num = s.replace(/^case_/i, '');
  return `case_${num}`;
}

export function portraitFileName(caseId) {
  const slug = normalizeCaseId(caseId);
  return slug ? `${slug}.png` : null;
}

export function portraitPublicUrl(caseId, origin) {
  const fileName = portraitFileName(caseId);
  if (!fileName) return null;
  const port = Number(process.env.PORT || process.env.SPORTMAKER_API_PORT || 3001);
  const base =
    origin
    || process.env.PUBLIC_URL?.replace(/\/$/, '')
    || `http://127.0.0.1:${port}`;
  return `${base}/case-portraits/${fileName}`;
}

function presentationCueForComplaint(cc) {
  const ccLower = String(cc || '').toLowerCase();
  if (/chest pain|mi|acs|angina/.test(ccLower)) {
    return 'mild diaphoresis, clutching chest, anxious expression';
  }
  if (/dyspnea|shortness|breath/.test(ccLower)) {
    return 'labored breathing, accessory muscle use, upright in bed';
  }
  if (/abdominal|belly|nausea|vomit|bleed/.test(ccLower)) {
    return 'guarding abdomen, mild nausea, uncomfortable but stable';
  }
  if (/fever|rash|infection/.test(ccLower)) {
    return 'febrile appearance, flushed or ill-appearing as appropriate';
  }
  if (/altered|confusion|syncope|seizure/.test(ccLower)) {
    return 'altered mental status cues without exaggeration';
  }
  return 'appropriate distress for the chief complaint';
}

function voiceToneForComplaint(cc, { speakAsChild = false } = {}) {
  if (speakAsChild) {
    return 'child voice — simple words, short sentences; parent may answer some questions';
  }
  const ccLower = String(cc || '').toLowerCase();
  if (/chest pain|mi|acs/.test(ccLower)) return 'anxious, guarded, speaks in short phrases';
  if (/dyspnea|shortness|breath/.test(ccLower)) return 'breathless, pauses between short sentences';
  if (/abdominal|belly|nausea|vomit|bleed/.test(ccLower)) return 'uncomfortable, quiet, may wince';
  if (/altered|confusion/.test(ccLower)) return 'confused, slow responses, may repeat questions';
  if (/fever|infection/.test(ccLower)) return 'fatigued, weak voice, intermittently alert';
  return 'tired but cooperative, answers in plain language';
}

/** Structured persona for patient_sim chat — from case JSON (+ optional vision pass on portrait). */
export function buildPortraitPersona(caseContext = {}, visionDetails = null) {
  const facts = caseContext.patientFacts || {};
  const demo = caseContext.patientDemographics || {};
  const age =
    facts.ageLabel ||
    demo.ageLabel ||
    (facts.age != null ? `${facts.age} ${facts.ageUnit || 'years'}` : demo.isPediatric ? '7 years' : 'adult');
  const sex = facts.sex || caseContext.patientSex || 'patient';
  const name = caseContext.patientName || facts.name || 'the patient';
  const cc =
    facts.chiefComplaint ||
    caseContext.chief_complaint ||
    caseContext.title ||
    'undifferentiated complaint';
  const presentationCue = presentationCueForComplaint(cc);
  const composition =
    'Single patient in hospital gown on ED stretcher; monitor cables and pulse ox visible; dignified clinical lighting; overhead/wide bedside framing.';
  const isPediatric = Boolean(demo.isPediatric || facts.isPediatric);
  const speakAsChild = Boolean(demo.speakAsChild || facts.speakAsChild);

  const base = {
    patientName: name,
    age,
    sex,
    chiefComplaint: cc,
    category: caseContext.category || null,
    isPediatric,
    speakAsChild,
    appearance: `${age} ${sex} in the ED with ${presentationCue}.`,
    distressLevel: presentationCue,
    composition,
    voiceTone: voiceToneForComplaint(cc, { speakAsChild }),
    summary: `${name} is a ${age} old ${sex} presenting with ${cc}. Visible distress: ${presentationCue}. ${composition}`,
  };

  if (!visionDetails || typeof visionDetails !== 'object') return base;

  const visionAge = visionDetails.estimatedAgeYears;
  const visionConflictsPediatric =
    base.isPediatric &&
    visionAge != null &&
    Number.isFinite(Number(visionAge)) &&
    Number(visionAge) >= 18;

  return {
    ...base,
    ...visionDetails,
    age: base.age,
    isPediatric: base.isPediatric,
    speakAsChild: base.speakAsChild,
    estimatedAgeYears:
      visionConflictsPediatric && base.isPediatric ? 7 : visionAge,
    summary: visionConflictsPediatric
      ? base.summary
      : visionDetails.summary ||
        [visionDetails.appearance, visionDetails.distress, visionDetails.composition]
          .filter(Boolean)
          .join(' ') ||
        base.summary,
  };
}

export function formatPersonaForChat(persona) {
  if (!persona || typeof persona !== 'object') return '';
  const lines = [
    persona.summary && `Summary: ${persona.summary}`,
    persona.appearance && `Appearance: ${persona.appearance}`,
    persona.distressLevel && `Distress: ${persona.distressLevel}`,
    persona.composition && `Scene/composition: ${persona.composition}`,
    persona.voiceTone && `Voice & manner: ${persona.voiceTone}`,
    persona.visibleFindings && `Visible findings: ${persona.visibleFindings}`,
    persona.personalityCues && `Personality cues: ${persona.personalityCues}`,
  ].filter(Boolean);
  return lines.join('\n');
}

/** Vision pass on generated portrait — grounds patient_sim in what the learner sees. */
export async function extractPersonaFromPortraitImage(imageBase64) {
  const key = process.env.OPENAI_API_KEY;
  if (!key || !imageBase64) return null;

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini',
      max_tokens: 520,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Describe this emergency department patient photo for a medical simulation chatbot.
Return JSON only with keys: appearance, distress, composition, visibleFindings, voiceTone, personalityCues, summary, estimatedAgeYears.
- estimatedAgeYears: best estimate of patient age in years (number; use decimals for infants, e.g. 0.5 for 6 months)
- appearance: age/sex presentation, skin, posture, clothing (1-2 sentences) — state if child vs adult clearly
- distress: how sick they look
- composition: bed, monitors, pose in frame
- visibleFindings: only what is clearly visible (no invented labs)
- voiceTone: how they would sound when speaking
- personalityCues: brief demeanor (cooperative, anxious, etc.)
- summary: one paragraph the chat model should treat as ground truth for roleplay
Clinical, dignified, no names unless visible on image.`,
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/png;base64,${imageBase64}` },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!r.ok) return null;
  const data = await r.json();
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return {
      appearance: parsed.appearance || null,
      distressLevel: parsed.distress || parsed.distressLevel || null,
      composition: parsed.composition || null,
      visibleFindings: parsed.visibleFindings || null,
      voiceTone: parsed.voiceTone || null,
      personalityCues: parsed.personalityCues || null,
      summary: parsed.summary || null,
      estimatedAgeYears:
        parsed.estimatedAgeYears != null ? Number(parsed.estimatedAgeYears) : null,
      source: 'vision',
    };
  } catch {
    return null;
  }
}

/** House-style cold-open portrait prompt from case presentation context. */
export function buildPortraitPrompt(caseContext = {}, { portraitBrief = '' } = {}) {
  const facts = caseContext.patientFacts || {};
  const demo = caseContext.patientDemographics || {};
  const age =
    facts.ageLabel ||
    demo.ageLabel ||
    (facts.age != null ? `${facts.age} ${facts.ageUnit || 'years'}` : demo.isPediatric ? '7 years' : 'adult');
  const sex = facts.sex || caseContext.patientSex || 'patient';
  const name = caseContext.patientName || facts.name || 'the patient';
  const cc =
    facts.chiefComplaint ||
    caseContext.chief_complaint ||
    caseContext.title ||
    'undifferentiated complaint';
  const category = caseContext.category ? ` (${caseContext.category})` : '';
  const excerpt = String(caseContext.hpiExcerpt || '').trim().slice(0, 220);

  const presentationCue = presentationCueForComplaint(cc);

  const contextLine = excerpt ? `History cue: ${excerpt}.` : '';

  const custom = String(portraitBrief || caseContext.portraitBrief || '').trim();
  const base = `Photorealistic emergency medicine training scene. ${age} old ${sex} named ${name} in an ED hospital bed${category}.
Chief complaint: ${cc}. ${contextLine}
Show ${presentationCue}. Single patient in hospital gown on stretcher, monitor cables and pulse ox visible, dignified clinical lighting.
Keep the same camera angle, bed alignment, and single-person framing as the reference template.
No text, watermark, logos, or extra people. No gore or sensational injury.`;

  if (!custom) return base;

  return `${base}

MANDATORY USER PORTRAIT DIRECTION (follow closely; overrides generic cues where they conflict):
${custom}
Match the described age, body size, ethnicity, pose, distress, clothing, and who is in frame. Keep dignified clinical ED photography — no gore, watermarks, or text.`;
}

/** Best-effort YouTube still for Real World avatar source (public thumbnail CDN). */
export async function fetchYouTubeThumbnailBase64(youtubeId) {
  const id = String(youtubeId || '').trim();
  if (!id || id.includes(' ')) throw new Error('Invalid YouTube id');

  const urls = [
    `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
    `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
  ];

  for (const url of urls) {
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 1200) continue;
      return {
        base64: buf.toString('base64'),
        mimeType: 'image/jpeg',
        thumbnailUrl: url,
      };
    } catch {
      /* try next */
    }
  }
  throw new Error('Could not fetch YouTube thumbnail for avatar');
}

/** Likeness portrait from a Real World patient still + case JSON. */
export function buildVideoAvatarPrompt(caseContext = {}, { patientName = '', videoTitle = '' } = {}) {
  const base = buildPortraitPrompt(caseContext);
  const who = [patientName, videoTitle].filter(Boolean).join(' — ');
  return `${base}

REAL PATIENT REFERENCE (from public patient story video${who ? `: ${who}` : ''}):
Preserve this person's facial likeness, apparent age, skin tone, and identity.
Place them in the same 3D-style ED hospital bed scene as other case portraits — dignified clinical training photo.
Single patient in hospital gown on stretcher, monitor cables visible, wide bedside framing.`;
}

export function buildPortraitAnalysis(caseContext = {}, persona = null) {
  const facts = caseContext.patientFacts || {};
  const base = {
    patientName: caseContext.patientName || facts.name || null,
    chiefComplaint:
      facts.chiefComplaint || caseContext.chief_complaint || caseContext.title || null,
    age: facts.age ?? null,
    ageUnit: facts.ageUnit || 'years',
    sex: facts.sex || caseContext.patientSex || null,
    category: caseContext.category || null,
  };
  if (!persona) return base;
  return { ...base, persona };
}

export async function readPortraitCache(portraitDir, caseId) {
  const fileName = portraitFileName(caseId);
  if (!fileName) return { exists: false, fileName: null, meta: null };
  const pngPath = path.join(portraitDir, fileName);
  const metaPath = path.join(portraitDir, fileName.replace(/\.png$/i, '.json'));
  try {
    await fsp.access(pngPath);
    let meta = {};
    try {
      meta = JSON.parse(await fsp.readFile(metaPath, 'utf8'));
    } catch {
      /* no meta */
    }
    return { exists: true, fileName, pngPath, meta };
  } catch {
    return { exists: false, fileName, pngPath, meta: null };
  }
}

export async function writePortraitCache(portraitDir, caseId, outB64, meta = {}) {
  const fileName = portraitFileName(caseId);
  if (!fileName) throw new Error('Invalid case id');
  const pngPath = path.join(portraitDir, fileName);
  const metaPath = path.join(portraitDir, fileName.replace(/\.png$/i, '.json'));
  await fsp.writeFile(pngPath, Buffer.from(outB64, 'base64'));
  const payload = {
    caseId: normalizeCaseId(caseId),
    cachedAt: new Date().toISOString(),
    provider: 'openai',
    ...meta,
  };
  await fsp.writeFile(metaPath, JSON.stringify(payload, null, 2), 'utf8');
  return { fileName, pngPath, meta: payload };
}

export async function generatePortraitWithOpenAI({ imageBase64, mimeType, prompt }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not configured');

  const form = new FormData();
  form.append('model', 'gpt-image-1');
  form.append('prompt', prompt);
  form.append('size', '1024x1024');
  // gpt-image-1 /images/edits rejects response_format; b64_json is returned by default.
  form.append('image', new Blob([Buffer.from(imageBase64, 'base64')], { type: mimeType }), 'patient.png');

  const r = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`OpenAI portrait edit failed: ${err || r.status}`);
  }
  const data = await r.json();
  const outB64 = data?.data?.[0]?.b64_json;
  if (!outB64) throw new Error('No image returned from OpenAI');
  return outB64;
}
