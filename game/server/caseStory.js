/** Case story — master narrative + third-person oversight still after session. */

import {
  beatCompositionDirective,
  buildCharacterLockPromptSection,
} from './caseStoryCharacterLock.js';
import {
  buildClinicalAccuracyPromptBlock,
  isHomeStoryBeat,
} from './clinicalAccuracyRules.js';
import { getForbiddenRenderStylePromptBlock } from '../src/lib/sceneCameraLock.js';

/** Bump when narrative prompt / storycraft rules change — stale cache ignored. */
export const CASE_STORY_PROMPT_VERSION = 6;

const STORYCRAFT_SYSTEM = `You are a clinical storyteller for MeWorld emergency medicine training (Storycraft Scale).

After the learner finishes (or pauses) a case, write a **case story** — third-person oversight prose the learner reads like a short clinical episode, NOT a chart note or order list.

Storycraft rules (mandatory):
- **5 beats** mapped to chapters: Disruption → Embodiment → Escalation → Crisis point → Recontextualization
- **Qualia:** at least one embodied sensory detail (cold floor, hollow stare, bruit under the stethoscope)
- **Sequence logic:** each beat causes the next ("because" not "and then")
- **Tellability:** one memorable true image or phrase tied to mechanism (e.g. scattered DWI specks = brain "peppered" with emboli for TIA)
- **Title:** short, human; witty clinical pun OK if accurate (e.g. TIA/embolic case → "The Man Who Got Peppered" not generic "Altered Mental Status")
- Third person. No bullet lists in chapter bodies. No "as an AI".

Return ONLY valid JSON:
{
  "title": "short episode title",
  "synopsis": "2-3 sentences — emotional + clinical hook",
  "chapters": [
    { "id": "c1", "heading": "Arrival", "body": "2-4 sentences third-person clinical prose", "visualHint": "third-person 3/4 oversight camera — location, action, props for THIS beat only" }
  ],
  "masterImagePrompt": "One paragraph visual brief for third-person oversight still — patient likeness, distress, props — NO bird's-eye overhead",
  "patientLock": "age, sex, ethnicity, gown — likeness lock for image gen"
}`;

const THIRD_PERSON_CAMERA = `THIRD-PERSON OVERSIGHT CAMERA (mandatory):
NOT bird's-eye 90° overhead — NOT camera standing directly above the patient.
Clinician-height beside the bed (~1.4m), 3/4 angle from foot of stretcher looking toward head.
Patient supine on ED stretcher, room depth visible — monitor upper-right, IV upper-left, both rails.
16:9 cinematic medical training still — MeWorld game style, sculptural tactile realism, muted clinical palette.
IN-GAME ONLY: smooth 3D sculptural CGI — NO uniform outlines, cel-shade, comic book, ink strokes, NPR illustration (comic strip style parked — see COMIC_STRIP_STYLE_FUTURE.md).`;

const COMPOSITION_VARIETY = `COMPOSITION (vary per beat — NOT every panel dead-center):
Avoid symmetrical foot-of-bed centerline on every still. Use rule-of-thirds: subject left-third, right-third, or lower third.
Alternate MCU, medium three-quarter, wide establishing, foreground occlusion (rail, paperwork, equipment).
Shallow depth of field — name foreground blur, midground subject, background room depth.`;

const HOME_SCENE_CAMERA = `HOME SCENE CAMERA (pre-hospital beats only):
Domestic interior — bedroom or living room, natural morning window light.
Third-person cinematic still — same MeWorld sculptural tactile realism, muted palette.
Patient in home clothes or pajamas — NOT hospital gown, NOT stretcher, NOT ED equipment.
16:9 cinematic still — environmental storytelling (fallen cane, bedside table, quiet isolation).`;

function formatSessionBlock(sessionContext = {}) {
  const parts = [];
  const placed = Array.isArray(sessionContext?.stacksPlaced)
    ? sessionContext.stacksPlaced.map((s) => (typeof s === 'string' ? s : s.label || s.id)).filter(Boolean)
    : [];
  if (placed.length) parts.push(`Orders placed: ${placed.join(', ')}`);

  const timeline = (sessionContext?.ordersTimeline || [])
    .slice(-12)
    .map((e) => e.label || e.type)
    .filter(Boolean);
  if (timeline.length) parts.push(`Order timeline: ${timeline.join(' → ')}`);

  const notes = String(sessionContext?.learnerNotes || '').trim();
  if (notes) parts.push(`Learner notes:\n${notes.slice(0, 1200)}`);

  const chat = (sessionContext?.chatMessages || [])
    .slice(-16)
    .map((m) => `${m.role}: ${String(m.content || '').slice(0, 280)}`)
    .join('\n');
  if (chat) parts.push(`Attendant / patient chat:\n${chat}`);

  const activity = (sessionContext?.sessionActivity || [])
    .slice(-12)
    .map((e) => `${e.role}: ${String(e.text || e.content || '').slice(0, 200)}`)
    .join('\n');
  if (activity) parts.push(`Scene activity:\n${activity}`);

  const exams = (sessionContext?.physicalExamFindings || [])
    .map((r) => `${r.label}: ${String(r.text || '').slice(0, 200)}`)
    .join('\n');
  if (exams) parts.push(`Physical exam proof:\n${exams}`);

  const labs = (sessionContext?.labResults || [])
    .map((r) => `${r.label}: ${String(r.text || '').slice(0, 200)}`)
    .join('\n');
  if (labs) parts.push(`Lab / imaging proof:\n${labs}`);

  const discuss = sessionContext?.caseDiscussion;
  if (discuss && typeof discuss === 'object') {
    const d = JSON.stringify(discuss).slice(0, 800);
    if (d.length > 4) parts.push(`Case discussion context: ${d}`);
  }

  if (sessionContext?.standardFlow) {
    parts.push(`Teach Me standard flow: ${JSON.stringify(sessionContext.standardFlow).slice(0, 600)}`);
  }

  return parts.length ? parts.join('\n\n') : '(no session activity yet — use case HPI only)';
}

export function buildCaseStoryNarrativePrompt({
  caseContext = {},
  sessionContext = {},
  orders = [],
  medicalSequence = null,
} = {}) {
  const orderBlock = orders
    .map((o, i) => `${i + 1}. ${o.label}${o.why ? ` — ${String(o.why).slice(0, 200)}` : ''}`)
    .join('\n');

  const placed = Array.isArray(sessionContext?.stacksPlaced)
    ? sessionContext.stacksPlaced.map((s) => (typeof s === 'string' ? s : s.label || s.id)).join(', ')
    : '';

  const sessionBlock = formatSessionBlock(sessionContext);

  return [
    {
      role: 'system',
      content: STORYCRAFT_SYSTEM,
    },
    {
      role: 'user',
      content: `CASE
Title: ${caseContext.title || '—'}
Category: ${caseContext.category || '—'}
Diagnosis: ${String(caseContext.diagnosis || caseContext.clinical_tip || '').slice(0, 400)}
HPI: ${String(caseContext.hpiExcerpt || caseContext.clinical_hpi_narrative || caseContext.historyText || '').slice(0, 700)}
Vitals: ${String(caseContext.vitalsText || JSON.stringify(caseContext.vitals || {})).slice(0, 200)}

STANDARD FLOW ORDERS
${orderBlock || '(none)'}

LEARNER SESSION (compile story from this — attendant chat, patient replies, exam/lab proof, notes)
${sessionBlock}

Orders placed summary: ${placed || '(none yet)'}

${medicalSequence?.missedPath?.length ? `DETERIORATION PATH (if missed): ${medicalSequence.missedPath.map((b) => b.title).join(' → ')}` : ''}`,
    },
  ];
}

export function buildCaseStoryMasterImagePrompt({
  caseContext = {},
  narrative = {},
  portraitNote = '',
  characterLockMarkdown = '',
} = {}) {
  const visual =
    narrative.masterImagePrompt
    || `${caseContext.title || 'ED patient'} on stretcher, clinical distress appropriate to presentation`;
  const lockSection = buildCharacterLockPromptSection(characterLockMarkdown);
  const clinicalBlock = buildClinicalAccuracyPromptBlock({ scene: 'ed' });

  return `${THIRD_PERSON_CAMERA}

${getForbiddenRenderStylePromptBlock()}

${clinicalBlock}

${visual}

Patient lock: ${narrative.patientLock || portraitNote || 'match reference patient likeness exactly'}.
${lockSection ? `\n${lockSection}\n` : ''}
${caseContext.category === 'Pediatrics' ? 'Pediatric body proportions — school-age child, NOT adult body.' : ''}
ONLY the patient on the stretcher — no standing staff on the bed, no extra feet at frame bottom.
Master still establishes character identity map for all storyboard beats.`;
}

export function deriveChapterVisualHint(chapter, { patientLock = '', caseContext = {} } = {}) {
  const hint = String(chapter?.visualHint || '').trim();
  if (hint) return hint;
  const heading = String(chapter?.heading || 'Beat').trim();
  const body = String(chapter?.body || '').slice(0, 180);
  const loc =
    caseContext?.category === 'Pediatrics'
      ? 'pediatric ED bay'
      : heading.toLowerCase().includes('home') || heading.toLowerCase().includes('disruption')
        ? 'home or ED arrival — match beat'
        : 'ED bay';
  return `${patientLock || 'same patient likeness'}, ${loc}, story beat "${heading}": ${body}`;
}

export function buildCaseStoryBeatImagePrompt({
  chapter = {},
  narrative = {},
  caseContext = {},
  portraitNote = '',
  characterLockMarkdown = '',
} = {}) {
  const visual = deriveChapterVisualHint(chapter, {
    patientLock: narrative.patientLock || portraitNote,
    caseContext,
  });
  const heading = String(chapter.heading || 'Beat').trim();
  const beatId = String(chapter.id || '').trim();
  const composition = beatCompositionDirective(beatId, { lockMarkdown: characterLockMarkdown });
  const lockSection = buildCharacterLockPromptSection(characterLockMarkdown, { beatsOnly: true });
  const homeBeat = isHomeStoryBeat(chapter);
  const cameraBlock = homeBeat ? HOME_SCENE_CAMERA : THIRD_PERSON_CAMERA;
  const clinicalBlock = buildClinicalAccuracyPromptBlock({
    scene: homeBeat ? 'home' : 'ed',
    beatId,
    chapter,
  });

  return `${cameraBlock}

${getForbiddenRenderStylePromptBlock()}

${clinicalBlock}

${homeBeat ? '' : `${COMPOSITION_VARIETY}\n\n`}STORYBOARD — "${heading}" (${beatId || 'beat'}): ${visual}

FRAMING: ${composition}

Patient: ${narrative.patientLock || portraitNote || 'match master likeness'}.
${lockSection ? `\n${lockSection}\n` : ''}
${caseContext.category === 'Pediatrics' ? 'Pediatric body proportions — school-age child, NOT adult body.' : ''}
MeWorld sculptural ${homeBeat ? 'domestic' : 'clinical'} still — one frozen moment from this beat. Match master reference likeness exactly.
${homeBeat ? 'Home interior — no hospital equipment.' : 'ONLY the patient (and implied family in depth if beat requires) — no clinician standing on the bed.'}`;
}

export function parseCaseStoryJson(raw) {
  const text = String(raw || '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('No JSON in case story response');
  const parsed = JSON.parse(text.slice(start, end + 1));
  return {
    title: String(parsed.title || 'Case story').trim(),
    synopsis: String(parsed.synopsis || '').trim(),
    chapters: (Array.isArray(parsed.chapters) ? parsed.chapters : []).map((c, i) => ({
      id: String(c.id || `c${i + 1}`),
      heading: String(c.heading || 'Chapter').trim(),
      body: String(c.body || '').trim(),
      visualHint: String(c.visualHint || c.visual || '').trim(),
    })),
    masterImagePrompt: String(parsed.masterImagePrompt || '').trim(),
    patientLock: String(parsed.patientLock || '').trim(),
  };
}
