// Live end-to-end probe: does the attending tutor SEE ordered lab values?
// Hits the running dev API (:3002), starts a tutor session for U15, sends a
// sessionContext with real lab results, and checks the reply references them.
const API = process.env.PROBE_API || 'http://127.0.0.1:3002';

async function post(path, body) {
  const r = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${path} ${r.status}: ${data.error || ''}`);
  return data;
}

const labResults = [
  { orderId: 'labs', label: 'BMP', kind: 'lab', kindLabel: 'Lab result', text: 'Glucose 642 mg/dL, Na 131, K 5.6, HCO3 12, anion gap 22, BUN 34, Cr 1.6' },
  { orderId: 'bhb', label: 'Beta-hydroxybutyrate', kind: 'lab', kindLabel: 'Lab result', text: 'Beta-hydroxybutyrate 5.8 mmol/L (markedly elevated)' },
  { orderId: 'vbg', label: 'VBG', kind: 'lab', kindLabel: 'Lab result', text: 'pH 7.18, pCO2 28 (partially compensated metabolic acidosis)' },
];

const sessionContext = {
  id: 'U15',
  hasSessionData: true,
  currentLocation: 'ER',
  ordersTimeline: [
    { seq: 1, label: 'IV Access + Fluids', kind: 'order' },
    { seq: 2, label: 'Stat Labs (BMP, BHB, VBG)', kind: 'lab' },
  ],
  labResults,
  imagingResults: [],
  physicalExamFindings: [],
  procedureResults: [],
  orderResults: labResults,
  stacksPlaced: ['IV Access + Fluids'],
  attendingDepth: 2,
};

const run = async () => {
  const start = await post('/api/case-chat/start', {
    caseContext: { id: 'U15', title: 'Ruth — Hyperglycemic Crisis', chatMode: 'tutor', presentationTitle: 'Hyperglycemic Emergency' },
  });
  console.log('session:', start.sessionId);

  const msg = await post('/api/case-chat/message', {
    sessionId: start.sessionId,
    message: 'What are my latest lab results and what do they show? Be specific with the numbers.',
    sessionContext,
  });

  const reply = String(msg.reply || msg.message || msg.text || JSON.stringify(msg));
  console.log('\n=== ATTENDING REPLY ===\n' + reply + '\n');

  const hits = ['642', '5.8', '7.18', 'anion gap', 'bicarb', 'hco3', 'ketone', 'bhb', 'beta-hydroxy'];
  const found = hits.filter((h) => reply.toLowerCase().includes(h.toLowerCase()));
  const asksForLabs = /(don'?t have|do not have|no access|provide the|share the|what (are|were) the lab|haven'?t (seen|received))/i.test(reply);
  console.log('value references found:', found.join(', ') || 'NONE');
  console.log('asks learner to provide labs:', asksForLabs);
  console.log(found.length >= 2 && !asksForLabs ? '\nRESULT: PASS — attending sees the labs.' : '\nRESULT: FAIL — attending did not use the lab values.');
};

run().catch((e) => { console.error('PROBE ERROR:', e.message); process.exit(1); });
