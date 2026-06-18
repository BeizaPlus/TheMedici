/** Build LLM prompt for case medical-sequence storyboard (prequel / missed / saved). */

import { sequenceFailsDemographicsCheck } from '../src/lib/medicalSequenceValidate.js';

export function caseDataStubFromContext(caseContext = {}, caseId = '') {
  return {
    id: caseId,
    title: caseContext.title,
    category: caseContext.category,
    hpi_narrative:
      caseContext.hpiExcerpt ||
      caseContext.clinical_hpi_narrative ||
      caseContext.historyText ||
      '',
    patientSex: caseContext.patientSex,
    diagnosis: caseContext.diagnosis,
    presentationKey: caseContext.presentationKey,
  };
}

export function assertMedicalSequenceDemographics(parsed, caseContext, caseId) {
  const stub = caseDataStubFromContext(caseContext, caseId);
  if (sequenceFailsDemographicsCheck(parsed, stub)) {
    throw new Error('Medical sequence failed demographics validation');
  }
  return parsed;
}

export function buildMedicalSequencePrompt({
  caseContext = {},
  orders = [],
  realWorldStories = [],
  portraitNote = '',
} = {}) {
  const orderBlock = orders
    .map(
      (o, i) =>
        `${i + 1}. [${o.id}] ${o.label}\n   Attendant why: ${String(o.why || o.playbookWhy || '').slice(0, 900)}`,
    )
    .join('\n\n');

  const rwBlock = realWorldStories
    .slice(0, 2)
    .map((s) => `- ${s.name}: ${String(s.summary || s.headline || '').slice(0, 400)}`)
    .join('\n');

  return [
    {
      role: 'system',
      content: `You are a clinical storyboard director for MeWorld emergency medicine training.

Given case context and attendant explanations for each order, produce a **medical sequence** — a visual storyboard of what happened before the ED and what would happen if critical orders were missed vs placed in time.

Rules:
- **Demographics lock (mandatory):** Read age/sex from case HPI and category. Adults (≥13y) never appear as infants — no wet diapers, bottles, "mom's arms" for a 70-year-old. Pediatric beats only for Pediatrics / age <13.
- Use attendant **mechanism** from order rationales (Immersa explainer voice) — tie missed/saved beats to specific orders.
- Same patient likeness throughout (age, sex, ethnicity from case).
- **prequel**: 2–4 beats at home / before arrival — must match chief complaint (AMS → weeks of decline + seizure; poor feeding → only if pediatric).
- **missedPath**: 4–8 beats — cumulative deterioration if emergent orders are delayed. Use attendant mechanisms.
- **savedPath**: 3–6 beats — stabilization when standard flow orders happen on time.
- **realWorldEcho**: one optional real-world teaching parallel if stories provided.
- Each beat: short title (≤8 words), caption (1–2 sentences, patient-centered), visualHint (camera + action, same likeness).
- Do NOT invent impossible anatomy.

Return ONLY valid JSON (no markdown fence):
{
  "patientLock": "string — age, sex, setting, likeness lock for image gen",
  "prequel": [{ "id": "p1", "title": "", "caption": "", "visualHint": "" }],
  "missedPath": [{ "id": "m1", "title": "", "caption": "", "visualHint": "", "tiedOrderId": "", "tiedOrderLabel": "" }],
  "savedPath": [{ "id": "s1", "title": "", "caption": "", "visualHint": "", "tiedOrderId": "" }],
  "realWorldEcho": { "name": "", "summary": "" }
}`,
    },
    {
      role: 'user',
      content: `CASE
Title: ${caseContext.title || '—'}
Category: ${caseContext.category || '—'}
Diagnosis pearl: ${String(caseContext.diagnosis || caseContext.clinical_tip || '').slice(0, 500)}
HPI: ${String(caseContext.hpiExcerpt || caseContext.clinical_hpi_narrative || caseContext.historyText || '').slice(0, 800)}
Vitals: ${String(caseContext.vitalsText || JSON.stringify(caseContext.vitals || {})).slice(0, 200)}
${portraitNote ? `Portrait lock: ${portraitNote}` : ''}

STANDARD FLOW ORDERS + ATTENDANT RATIONALE
${orderBlock || '(none)'}

REAL WORLD STORIES (optional echo)
${rwBlock || '(none)'}`,
    },
  ];
}

export function parseMedicalSequenceJson(raw) {
  const text = String(raw || '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('No JSON object in model response');
  const parsed = JSON.parse(text.slice(start, end + 1));
  const normBeats = (arr) =>
    (Array.isArray(arr) ? arr : []).map((b, i) => ({
      id: String(b.id || `beat-${i + 1}`),
      title: String(b.title || 'Beat').trim(),
      caption: String(b.caption || '').trim(),
      visualHint: String(b.visualHint || b.visual || '').trim(),
      tiedOrderId: b.tiedOrderId ? String(b.tiedOrderId) : '',
      tiedOrderLabel: b.tiedOrderLabel ? String(b.tiedOrderLabel) : '',
    }));
  return {
    patientLock: String(parsed.patientLock || '').trim(),
    prequel: normBeats(parsed.prequel),
    missedPath: normBeats(parsed.missedPath),
    savedPath: normBeats(parsed.savedPath),
    realWorldEcho: parsed.realWorldEcho
      ? {
          name: String(parsed.realWorldEcho.name || '').trim(),
          summary: String(parsed.realWorldEcho.summary || '').trim(),
        }
      : null,
  };
}
