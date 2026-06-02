/**
 * Per-order rationale for case bank + preparedCases.
 * Never duplicate case_summary across every stack.
 */

function norm(label) {
  return String(label || '')
    .toLowerCase()
    .replace(/\s*\/\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clip(text, max = 320) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

function examFindingForLabel(physicalExam, labelKey) {
  if (!physicalExam || typeof physicalExam !== 'object') return '';
  const rows = Array.isArray(physicalExam)
    ? physicalExam
    : Object.entries(physicalExam).map(([k, v]) => [k, v]);
  const n = norm(labelKey);
  for (const [k, v] of rows) {
    if (v == null || !String(v).trim()) continue;
    const key = norm(k);
    if (
      (n.includes('heart') || n.includes('cardiovascular')) &&
      (key.includes('cardiovascular') || key.includes('heart'))
    ) {
      return String(v).trim();
    }
    if ((n.includes('lung') || n.includes('chest')) && (key.includes('lung') || key.includes('respiratory'))) {
      return String(v).trim();
    }
    if (n.includes('abdomen') && key.includes('abdomen')) return String(v).trim();
    if (n.includes('skin') && key.includes('skin')) return String(v).trim();
    if (n.includes('general') && key.includes('general')) return String(v).trim();
    if ((n.includes('heent') || n.includes('neck')) && key.includes('heent')) return String(v).trim();
    if ((n.includes('pelvic') || n.includes('cervical') || n.includes('genital')) && 
        (key.includes('genital') || key.includes('pelvic') || key.includes('cervical'))) {
      return String(v).trim();
    }
  }
  return '';
}

function addAnswerKeyItems(map, list, role) {
  if (!Array.isArray(list)) return;
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const order = item.order || item.label || item.name;
    const why =
      item.rationale ||
      item.why ||
      item.why_wrong ||
      item.explanation ||
      (role === 'avoid' ? item.why_avoid : '');
    if (order && why) map[String(order).trim()] = clip(why);
  }
}

/** Pull per-order text from Ollama answer_key and order objects. */
export function extractPerOrderRationales(entry) {
  const map = {};

  const orderLists = [
    entry.correct_orders,
    entry.should_have_ordered,
    entry.correctly_avoided,
    entry.inappropriate_orders,
    entry.orders_placed_by_student,
  ];
  for (const list of orderLists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (typeof item === 'string') continue;
      const order = item.order || item.label;
      const why = item.rationale || item.why || item.why_wrong;
      if (order && why) map[String(order).trim()] = clip(why);
    }
  }

  const ak = entry.answer_key;
  if (ak && typeof ak === 'object') {
    addAnswerKeyItems(map, ak.correctly_ordered, 'correct');
    addAnswerKeyItems(map, ak.should_have_ordered, 'correct');
    addAnswerKeyItems(map, ak.should_have_ordered_late, 'correct');
    addAnswerKeyItems(map, ak.treatment_correctly_ordered, 'correct');
    addAnswerKeyItems(map, ak.treatment_optional, 'correct');
    addAnswerKeyItems(map, ak.inappropriate_orders, 'avoid');
    addAnswerKeyItems(map, ak.correctly_avoided, 'avoid');
  }

  if (entry.rationale && typeof entry.rationale === 'object' && !Array.isArray(entry.rationale)) {
    for (const [k, v] of Object.entries(entry.rationale)) {
      if (k && v) map[k] = clip(v);
    }
  }

  return map;
}

export function isGenericDuplicateWhy(why, entry) {
  if (!why || !entry) return false;
  const summary = clip(entry.case_summary, 200);
  const hpi = clip(typeof entry.hpi === 'string' ? entry.hpi : '', 200);
  const w = clip(why, 200);
  if (!summary && !hpi) return false;
  if (summary && (w === summary || summary.startsWith(w) || w.startsWith(summary))) return true;
  if (hpi && (w === hpi || hpi.startsWith(w) || w.startsWith(hpi))) return true;
  return false;
}

/** Order-specific fallback when screenshot/Ollama has no per-order rationale. */
export function synthesizeOrderWhy(label, entry, role = 'correct') {
  const l = norm(label);
  const dx = entry?.diagnosis && entry.diagnosis !== 'Unknown' ? entry.diagnosis : 'this diagnosis';
  const topic = (entry?.title || 'this presentation').toLowerCase();
  const finding = examFindingForLabel(entry?.physical_exam, l);

  if (role === 'avoid') {
    if (l.includes('cbc') || l.includes('complete blood')) {
      return clip(
        `CBC is not needed for uncomplicated ${dx} without fever, systemic symptoms, or abnormal vitals.`,
      );
    }
    if (l.includes('ct') || l.includes('mri')) {
      return clip(`Advanced imaging is not indicated early for ${dx} when the diagnosis is clinical.`);
    }
    if (l.includes('x-ray') || l.includes('xray')) {
      return clip(`This imaging is not required for the expected CCS pathway in ${dx}.`);
    }
    if (l.includes('iv fluid') || l.includes('intravenous access')) {
      return clip(`IV fluids/access are not indicated unless the patient is unstable or cannot tolerate PO.`);
    }
    return clip(`CCS review: avoid this order for ${dx} — it does not change acute management.`);
  }

  if (l.includes('general appearance')) {
    return clip(
      `Assess how ill the patient appears before focused testing for ${topic}.`,
    );
  }
  if (l.includes('lung') || l.includes('chest') || l.includes('respiratory')) {
    const base = `Evaluate chest and lungs as part of the initial exam for ${topic}.`;
    return clip(finding ? `${base} Finding: ${finding}` : base);
  }
  if (l.includes('heart') || l.includes('cardiovascular') || l.includes('cardiac')) {
    const base = `Cardiovascular exam is part of the ED survey; rule out cardiopulmonary contributors to ${topic}.`;
    return clip(finding ? `${base} Finding: ${finding}` : base);
  }
  if (l.includes('abdomen')) {
    const base = `Abdominal exam helps exclude alternative causes in a patient with ${topic}.`;
    return clip(finding ? `${base} Finding: ${finding}` : base);
  }
  if (l.includes('skin')) {
    const base = `Skin exam may show rashes or systemic signs relevant to ${dx}.`;
    return clip(finding ? `${base} Finding: ${finding}` : base);
  }
  if (l.includes('extremit') || l.includes('neuro') || l.includes('heent') || l.includes('lymph')) {
    return clip(`Targeted ${label} exam supports the differential for ${dx}.`);
  }
  if (l.includes('cervical') || l.includes('pelvic') || l.includes('genital') || l.includes('breast')) {
    return clip(
      `Pelvic/cervical evaluation is central for ${dx} and localizes the source of ${topic}.`,
    );
  }
  if (l.includes('pulse ox') || l.includes('spo2') || l.includes('oximetry')) {
    return clip(`Pulse oximetry documents oxygenation in the initial assessment.`);
  }
  if (l.includes('ekg') || l.includes('electrocardiograph')) {
    return clip(`ECG screens for cardiac ischemia or arrhythmia when clinically appropriate.`);
  }
  if (l.includes('x-ray') || l.includes('xray') || l.includes('radiograph')) {
    return clip(`Imaging supports diagnosis when exam findings warrant it for ${dx}.`);
  }
  if (l.includes('cbc') || l.includes('bmp') || l.includes('metabolic') || l.includes('culture')) {
    return clip(`Laboratory testing when systemic illness or severity warrants labs in ${dx}.`);
  }
  if (l.includes('dexamethasone') || l.includes('prednisone') || l.includes('steroid') || l.includes('epinephrine') || l.includes('nebul')) {
    return clip(`Treatment aligned with CCS management for ${dx}.`);
  }
  if (l.includes('counsel') || l.includes('education') || l.includes('moisturizer') || l.includes('hormone')) {
    return clip(`Patient education and counseling are part of definitive care for ${dx}.`);
  }
  if (l.includes('report') || l.includes('pathology') || l.includes('biopsy')) {
    return clip(`Diagnostic report or tissue diagnosis clarifies the cause of ${topic}.`);
  }
  if (l.includes('vitals') || l.includes('vital sign')) {
    return clip(`Vital signs establish baseline stability before further orders.`);
  }
  if (l.includes('time advanced') || l.includes('location')) {
    return clip(`CCS case progression step for this scenario.`);
  }

  return clip(`Appropriate CCS order for ${dx}: ${label}.`);
}

/** Build full rationale map for a case — unique per order label. */
export function buildRationaleMap(entry) {
  const extracted = extractPerOrderRationales(entry);
  const map = {};
  const correct = [...(entry.correct_orders || [])];
  for (const o of entry.should_have_ordered || []) {
    const label = typeof o === 'string' ? o : o?.order || o?.label;
    if (label && !correct.includes(label)) correct.push(label);
  }
  for (const o of entry?.answer_key?.treatment_optional || entry?.treatment_optional || []) {
    const label = typeof o === 'string' ? o : o?.order || o?.label;
    if (label && !correct.some((existing) => String(typeof existing === 'string' ? existing : existing?.order || existing?.label).toLowerCase() === String(label).toLowerCase())) {
      correct.push({
        order: label,
        rationale: typeof o === 'object' ? o.rationale || o.why || '' : '',
        optional: true,
        affects_grade: typeof o === 'object' ? o.affects_grade : undefined,
        section: 'treatment_optional',
      });
    }
  }
  const avoid = [...(entry.correctly_avoided || [])];

  for (const item of correct) {
    const label = typeof item === 'string' ? item : item?.order || item?.label;
    if (!label) continue;
    const key = String(label).trim();
    let why = extracted[key];
    if (!why || isGenericDuplicateWhy(why, entry)) {
      why = synthesizeOrderWhy(key, entry, 'correct');
    }
    map[key] = why;
  }

  for (const item of avoid) {
    const label = typeof item === 'string' ? item : item?.order || item?.label;
    if (!label) continue;
    const key = String(label).trim();
    let why = extracted[key];
    if (!why || isGenericDuplicateWhy(why, entry)) {
      why = synthesizeOrderWhy(key, entry, 'avoid');
    }
    map[key] = why;
  }

  return map;
}

export function resolveOrderWhy(label, rationaleMap, entry, role = 'correct') {
  const key = String(label || '').trim();
  const fromMap = rationaleMap?.[key];
  if (fromMap && !isGenericDuplicateWhy(fromMap, entry)) return fromMap;
  return synthesizeOrderWhy(key, entry, role);
}
