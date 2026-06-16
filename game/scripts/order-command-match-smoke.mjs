import {
  findStackMatchForQuery,
  findKnownOrderMatch,
  orderAliasMatchesQuery,
  stackAliasList,
  resolveCaseStackOrder,
} from '../src/lib/orderCommandAutocomplete.js';
import prepared from '../src/data/preparedCases.json' with { type: 'json' };
import medicalOrders from '../src/data/medical-orders.json' with { type: 'json' };

const fluids = { id: 'fluids', label: 'Normal saline / Lactated Ringer / 0.45% saline' };
const insulin = { id: 'insulin', label: 'Insulin (regular / lispro / glargine / NPH)' };
const cbc = { id: 'cbc', label: 'CBC with differential' };
const stacks = [insulin, fluids, cbc];

const cases = [
  ['normal saline', fluids.label],
  ['normal', fluids.label],
  ['saline', fluids.label],
  ['ringer', fluids.label],
  ['lactated', fluids.label],
  ['ns', fluids.label],
  ['lr', fluids.label],
  ['insulin', insulin.label],
  ['lispro', insulin.label],
  ['cbc', cbc.label],
];

let failed = 0;
for (const [q, expected] of cases) {
  const m = findStackMatchForQuery(q, stacks, {});
  if (m?.label !== expected) {
    failed += 1;
    console.error('FAIL', { q, got: m?.label, expected });
  }
}

const insulinAliases = stackAliasList(insulin);
if (insulinAliases.includes('normal saline') || orderAliasMatchesQuery('normal saline', insulin.label, insulinAliases)) {
  failed += 1;
  console.error('FAIL insulin falsely matches normal saline');
}

if (failed) process.exit(1);

const case4 = prepared.cases['004'].interventions;
const ALL = Object.entries(medicalOrders).flatMap(([category, orders]) =>
  orders.map((name) => ({ name, category })),
);
const insulinCase = case4.find((iv) => iv.label.includes('Insulin'));
if (!insulinCase || resolveCaseStackOrder('insulin', case4, {})?.id !== insulinCase.id) {
  failed += 1;
  console.error('FAIL case 004 insulin stack match');
}
if (findKnownOrderMatch('insulin', ALL, case4, {})) {
  failed += 1;
  console.error('FAIL insulin should not be known-only order on case 004');
}

if (failed) process.exit(1);
console.log(`order-command-match-smoke: ${cases.length} OK + case 004 insulin`);
