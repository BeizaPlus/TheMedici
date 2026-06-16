import assert from 'node:assert/strict';
import { resolveOrderResult } from '../src/lib/orderResult.js';

const dkaCase = {
  id: '004',
  diagnosis: 'Diabetic ketoacidosis',
  hpi_narrative: 'Young adult with polyuria, polydipsia, and vomiting.',
};

const sleCase = {
  id: '094',
  diagnosis: 'Systemic Lupus Erythematosus',
  category: 'Rheumatology',
  hpi_narrative:
    'Malar rash sparing nasolabial folds, photosensitivity, polyarthritis, fatigue, and fever.',
};

const cbcIv = { label: 'CBC with differential', why: 'Will show leukocytosis in DKA.' };
const bmpIv = { label: 'BMP', why: 'Will show hyperglycemia and anion gap acidosis.' };
const combinedIv = {
  label: 'CBC / BMP / UA',
  why: 'Cytopenias, nephritis screen.',
};

const practiceCbc = resolveOrderResult(cbcIv, { caseData: dkaCase, teachMeMode: false });
assert.match(practiceCbc.text, /WBC 14\.2 K\/µL/);
assert.doesNotMatch(practiceCbc.text, /leukocytosis|DKA|may reflect/i);

const teachCbc = resolveOrderResult(cbcIv, { caseData: dkaCase, teachMeMode: true });
assert.match(teachCbc.text, /leukocytosis/i);
assert.match(teachCbc.text, /stress\/dehydration/i);

const practiceBmp = resolveOrderResult(bmpIv, { caseData: dkaCase, teachMeMode: false });
assert.match(practiceBmp.text, /Glucose 612 mg\/dL/);
assert.doesNotMatch(practiceBmp.text, /See values in chart/i);

const teachBmp = resolveOrderResult(bmpIv, { caseData: dkaCase, teachMeMode: true });
assert.match(teachBmp.text, /Anion gap/i);

const practiceCombined = resolveOrderResult(combinedIv, { caseData: sleCase, teachMeMode: false });
assert.match(practiceCombined.text, /CBC:/);
assert.match(practiceCombined.text, /BMP:/);
assert.match(practiceCombined.text, /UA:/);
assert.match(practiceCombined.text, /WBC \d+\.\d K\/µL/);
assert.match(practiceCombined.text, /Glucose \d+ mg\/dL/);
assert.match(practiceCombined.text, /Protein 2\+/);
assert.doesNotMatch(practiceCombined.text, /See values in chart/i);

const teachCombined = resolveOrderResult(combinedIv, { caseData: sleCase, teachMeMode: true });
assert.match(teachCombined.text, /Proteinuria|nephritis|cytopenias/i);

const whyOnly = { label: 'Rare specialty panel', why: 'Will show that glucose is critically elevated.' };
const practiceWhy = resolveOrderResult(whyOnly, { caseData: dkaCase, teachMeMode: false });
assert.doesNotMatch(practiceWhy.text, /glucose is critically elevated/i);

const teachWhy = resolveOrderResult(whyOnly, { caseData: dkaCase, teachMeMode: true });
assert.match(teachWhy.text, /glucose is critically elevated/i);

console.log('order-result-mode-smoke: ok');
