import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Skill default — tighter than patient for accuracy. */
export const IMMERSA_ATTENDANT_BASE_TEMPERATURE = 0.7;

let cachedCorePrompt = null;

export function loadImmersaAttendantCorePrompt() {
  if (cachedCorePrompt) return cachedCorePrompt;
  const raw = fs.readFileSync(path.join(__dirname, 'prompts/immersa-attendant.md'), 'utf8');
  cachedCorePrompt = raw.trim();
  return cachedCorePrompt;
}

/** Map simulation creativity slider to attendant temperature (skill base 0.7). */
export function immersaAttendantTemperature(simulationCreativity = 55) {
  const c = Math.max(0, Math.min(100, Number(simulationCreativity) || 55));
  if (c < 30) return 0.55;
  if (c < 65) return IMMERSA_ATTENDANT_BASE_TEMPERATURE;
  return 0.75;
}

export function buildImmersaAttendantSystemPrompt(ctx, { formatCaseDiscussionForChat } = {}) {
  const formatDiscussion =
    typeof formatCaseDiscussionForChat === 'function' ? formatCaseDiscussionForChat : () => '';

  return `${loadImmersaAttendantCorePrompt()}

---

## Runtime binding (this case)

You are the **Immersa AI Attendant** — master clinical tutor for this emergency medicine case. You are **NOT** the patient. Never reply in patient first person.

### Platform rules (MeWorld)
- When the learner streams partial knowledge (correct + wrong + "I forgot"), affirm what is right, correct errors plainly, fill gaps, and tie back to this case's orders and findings.
- Do not invent labs, imaging results, or outcomes not present in CASE JSON unless clearly labeled as teaching speculation.
- When \`differentialStudyContext\` is present, use it for CCS orders, treatment stacks, answer-key differentials, Real World stories, and picture notes.
- When the learner message includes **SESSION SO FAR** (orders timeline, Teach Me standard flow), use live session data to explain placement mistakes, out-of-order steps, and what to do next.
- NEVER return an empty reply. If the question is long, summarize the learner's points, then teach.
- For anti-dsDNA vs anti-Smith: anti-dsDNA targets native double-stranded DNA (nucleosomes); anti-Smith is anti-Sm nuclear ribonucleoprotein — not topoisomerase.
- SLE musculoskeletal: avascular necrosis (esp. with steroids), inflammatory arthritis — not primarily "bone marrow attack."

### CASE SUMMARY
- Title: ${ctx?.title || '—'}
- Category: ${ctx?.category || '—'}
- Patient: ${ctx?.patientName || '—'}
- Chief complaint: ${ctx?.chief_complaint || ctx?.patientFacts?.chiefComplaint || '—'}
${ctx?.diagnosis ? `- Working diagnosis (teach only — learner may not know yet): ${ctx.diagnosis}` : ''}
${ctx?.clinical_tip ? `- Clinical pearl: ${ctx.clinical_tip}` : ''}
${ctx?.objective ? `- Case objective: ${ctx.objective}` : ''}

### HPI / PRESENTATION
${ctx?.hpiExcerpt || ctx?.historyText || ctx?.clinical_hpi_narrative || '(see CASE JSON)'}

${ctx?.vitalsText ? `### VITALS\n${ctx.vitalsText}\n` : ''}${
  ctx?.caseDiscussion
    ? `### PRIOR CASE DISCUSSION & TRANSCRIPTS\n${formatDiscussion(ctx.caseDiscussion)}\n`
    : ''
}${
  ctx?.caseBriefMarkdown
    ? `### CASE DOSSIER\n${ctx.caseBriefMarkdown}\n`
    : ''
}
### CASE JSON
${JSON.stringify(ctx, null, 2)}`;
}

/** Short attendant voice for inline order-why tooltips. */
export function buildImmersaOrderWhySystemPrompt() {
  return `${loadImmersaAttendantCorePrompt()}

You are explaining why ONE specific order belongs in THIS case during active play.
Write 2–4 short sentences. Lead with mechanism or what you are ruling in/out — not a feature list.
Be specific to this patient's presentation. No "as an AI".`;
}
