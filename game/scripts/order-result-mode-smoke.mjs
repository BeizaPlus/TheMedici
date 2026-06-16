import assert from 'node:assert/strict';
import { resolveOrderResult } from '../src/lib/orderResult.js';

const dkaCase = {
  id: '004',
  diagnosis: 'Diabetic ketoacidosis',
  hpi_narrative: 'Young adult with polyuria, polydipsia, and vomiting.',
};

const cbcIv = { label: 'CBC with differential', why: 'Will show leukocytosis in DKA.' };
const bmpIv = { label: 'BMP', why: 'Will show hyperglycemia and anion gap acidosis.' };

const practiceCbc = resolveOrderResult(cbcIv, { caseData: dkaCase, teachMeMode: false });
assert.match(practiceCbc.text, /WBC 14\.2 K\/µL/);
assert.doesNotMatch(practiceCbc.text, /leukocytosis|DKA|may reflect/i);

const teachCbc = resolveOrderResult(cbcIv, { caseData: dkaCase, teachMeMode: true });
assert.match(teachCbc.text, /leukocytosis/i);
assert.match(teachCbc.text, /DKA/i);

const practiceBmp = resolveOrderResult(bmpIv, { caseData: dkaCase, teachMeMode: false });
assert.doesNotMatch(practiceBmp.text, /consistent with|anion gap/i);

const teachBmp = resolveOrderResult(bmpIv, { caseData: dkaCase, teachMeMode: true });
assert.match(teachBmp.text, /anion gap/i);

const whyOnly = { label: 'Rare specialty panel', why: 'Will show that glucose is critically elevated.' };
const practiceWhy = resolveOrderResult(whyOnly, { caseData: dkaCase, teachMeMode: false });
assert.doesNotMatch(practiceWhy.text, /glucose is critically elevated/i);

const teachWhy = resolveOrderResult(whyOnly, { caseData: dkaCase, teachMeMode: true });
assert.match(teachWhy.text, /glucose is critically elevated/i);

console.log('order-result-mode-smoke: ok');
