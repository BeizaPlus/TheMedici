/** Extract a spoiler-safe visual brief for portrait generation (director + clinician). */

const DIAGNOSIS_BLOCKLIST =
  /\b(diagnosis|diabetic ketoacidosis|dka|myocardial infarction|sepsis|pneumonia|appendicitis|endometriosis)\b/gi;

function clip(text, max = 400) {
  const s = String(text || '').trim();
  if (!s) return '';
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

function chatSnippet(chatMessages = [], limit = 12) {
  return (Array.isArray(chatMessages) ? chatMessages : [])
    .filter((m) => m?.content && (m.role === 'user' || m.role === 'assistant' || m.role === 'patient'))
    .slice(-limit)
    .map((m) => `${m.role}: ${clip(m.content, 220)}`)
    .join('\n');
}

function stripDiagnosisSpoilers(text, learningMode = true) {
  if (!learningMode || !text) return text;
  return String(text).replace(DIAGNOSIS_BLOCKLIST, '[finding]');
}

/** Rule-based brief when LLM unavailable. */
export function buildPortraitDirectorBriefFallback(caseContext = {}, { chatMessages = [] } = {}) {
  const learning = caseContext.learningMode !== false;
  const facts = caseContext.patientFacts || {};
  const demo = caseContext.patientDemographics || {};
  const name = caseContext.patientName || facts.name || 'patient';
  const age =
    facts.ageLabel ||
    demo.ageLabel ||
    (facts.age != null ? `${facts.age} ${facts.ageUnit || 'years'}` : 'adult');
  const sex = facts.sex || caseContext.patientSex || 'patient';
  const cc = facts.chiefComplaint || caseContext.chief_complaint || caseContext.title || '';
  const hpi = clip(
    caseContext.clinical_hpi_narrative ||
      caseContext.hpiExcerpt ||
      caseContext.historyText ||
      '',
    320,
  );
  const chat = chatSnippet(chatMessages, 10);
  const discussed = [hpi, chat].filter(Boolean).join('\n');
  const safeDiscussed = stripDiagnosisSpoilers(discussed, learning);

  return {
    patientLabel: `${age} ${sex} (${name})`,
    chiefComplaint: clip(cc, 120),
    visibleFindings: safeDiscussed || 'Appropriate distress for chief complaint; dignified ED presentation.',
    distress: 'Match severity described in presentation — not exaggerated.',
    pose: 'Supine on ED stretcher, hospital gown, monitor cables and pulse ox visible.',
    skinAndExam:
      'Render discussed exam findings in correct anatomic locations only when mentioned (e.g. dry mucosa, rash location, guarding).',
    ivState: 'arrival',
    noDiagnosisLabels: learning,
    noTextInImage: true,
    source: 'fallback',
  };
}

export async function extractPortraitDirectorBrief(
  caseContext = {},
  { chatMessages = [], portraitBrief = '', callChat = null } = {},
) {
  const fallback = buildPortraitDirectorBriefFallback(caseContext, { chatMessages });
  const custom = String(portraitBrief || caseContext.portraitBrief || '').trim();
  if (custom) {
    return {
      ...fallback,
      visibleFindings: `${fallback.visibleFindings}\nUser direction: ${clip(custom, 400)}`,
      source: 'custom+fallback',
    };
  }

  if (typeof callChat !== 'function') return fallback;

  const chat = chatSnippet(chatMessages, 14);
  const learning = caseContext.learningMode !== false;
  const system = `You are a clinical photographer and ED physician preparing a patient portrait brief.
Return JSON only with keys: visibleFindings, distress, pose, skinAndExam, companionsInFrame.
Rules:
- Use ONLY facts from case presentation and patient chat — no invented labs or diagnosis names.
${learning ? '- LEARNING MODE: never name a final diagnosis; describe appearance and exam findings only.' : ''}
- skinAndExam: if a rash/lesion/finding is mentioned, state the correct body region.
- pose: ED stretcher, hospital gown, dignified clinical photo.`;

  const user = [
    `Patient: ${fallback.patientLabel}`,
    `Chief complaint: ${fallback.chiefComplaint}`,
    `HPI: ${clip(caseContext.clinical_hpi_narrative || caseContext.hpiExcerpt || '', 500)}`,
    chat ? `Recent patient chat:\n${chat}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  try {
    const raw = await callChat(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { maxTokens: 480, temperature: 0.25 },
    );
    const parsed = JSON.parse(String(raw || '').trim());
    return {
      ...fallback,
      visibleFindings: stripDiagnosisSpoilers(
        parsed.visibleFindings || fallback.visibleFindings,
        learning,
      ),
      distress: parsed.distress || fallback.distress,
      pose: parsed.pose || fallback.pose,
      skinAndExam: parsed.skinAndExam || fallback.skinAndExam,
      companionsInFrame: parsed.companionsInFrame || null,
      source: 'llm',
    };
  } catch {
    return fallback;
  }
}

export function logPortraitRegenBlock({
  caseId,
  directorBrief,
  prompts = {},
  meta = {},
  timingMs = 0,
}) {
  const bar = '─'.repeat(56);
  console.log(`\n[case-portrait] ${bar}`);
  console.log(`[case-portrait] REGENERATE case ${caseId} (${timingMs}ms)`);
  console.log(`[case-portrait] director source: ${directorBrief?.source || 'unknown'}`);
  console.log(`[case-portrait] patient: ${directorBrief?.patientLabel || '—'}`);
  console.log(`[case-portrait] findings: ${clip(directorBrief?.visibleFindings, 200)}`);
  if (directorBrief?.skinAndExam) {
    console.log(`[case-portrait] skin/exam: ${clip(directorBrief.skinAndExam, 160)}`);
  }
  console.log(`[case-portrait] layers: base=${meta.hasBase ? 'yes' : 'no'} iv=${meta.hasIv ? 'yes' : 'no'} mask=${meta.hasMask ? 'yes' : 'no'}`);
  if (prompts.basePreview) console.log(`[case-portrait] prompt(base): ${clip(prompts.basePreview, 180)}`);
  if (prompts.ivPreview) console.log(`[case-portrait] prompt(iv): ${clip(prompts.ivPreview, 180)}`);
  console.log(`[case-portrait] ${bar}\n`);
}
