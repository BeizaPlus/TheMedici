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

export function portraitPublicUrl(caseId, port = Number(process.env.SPORTMAKER_API_PORT || 3001)) {
  const fileName = portraitFileName(caseId);
  if (!fileName) return null;
  return `http://127.0.0.1:${port}/case-portraits/${fileName}`;
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

function voiceToneForComplaint(cc) {
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
  const age =
    facts.age != null ? `${facts.age} ${facts.ageUnit || 'years'}` : 'adult';
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

  const base = {
    patientName: name,
    age,
    sex,
    chiefComplaint: cc,
    category: caseContext.category || null,
    appearance: `${age} ${sex} in the ED with ${presentationCue}.`,
    distressLevel: presentationCue,
    composition,
    voiceTone: voiceToneForComplaint(cc),
    summary: `${name} is a ${age} old ${sex} presenting with ${cc}. Visible distress: ${presentationCue}. ${composition}`,
  };

  if (!visionDetails || typeof visionDetails !== 'object') return base;

  return {
    ...base,
    ...visionDetails,
    summary:
      visionDetails.summary ||
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
Return JSON only with keys: appearance, distress, composition, visibleFindings, voiceTone, personalityCues, summary.
- appearance: age/sex presentation, skin, posture, clothing (1-2 sentences)
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
      source: 'vision',
    };
  } catch {
    return null;
  }
}

/** House-style cold-open portrait prompt from case presentation context. */
export function buildPortraitPrompt(caseContext = {}) {
  const facts = caseContext.patientFacts || {};
  const age =
    facts.age != null ? `${facts.age} ${facts.ageUnit || 'years'}` : 'adult';
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

  return `Photorealistic emergency medicine training scene. ${age} old ${sex} named ${name} in an ED hospital bed${category}.
Chief complaint: ${cc}. ${contextLine}
Show ${presentationCue}. Single patient in hospital gown on stretcher, monitor cables and pulse ox visible, dignified clinical lighting.
Keep the same camera angle, bed alignment, and single-person framing as the reference template.
No text, watermark, logos, or extra people. No gore or sensational injury.`;
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
  form.append('response_format', 'b64_json');
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
