// Probe the new "Interpret" button flow: simulate the exact tutor message the
// card sends, using the BMP panel from the user's screenshot, and confirm the
// attending interprets it (this same reply is what gets logged into the chat).
const API = process.env.PROBE_API || 'http://127.0.0.1:3002';
const post = async (p, b) => {
  const r = await fetch(`${API}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${p} ${r.status}: ${d.error || ''}`);
  return d;
};

const label = 'BMP / Ca / Phos / Albumin';
const text = 'Glucose 92 mg/dL. Na 137 mEq/L. K 6.2 mEq/L. Cl 101 mEq/L. HCO3 16 mEq/L. BUN 82 mg/dL. Cr 7.4 mg/dL. Ca 7.6 mg/dL. Phos 6.9 mg/dL. Albumin 3.1 g/dL.';
const prompt = `Interpret the ${label} results for this patient. Relate each abnormal value to the clinical picture and say what it changes in management — be specific.\n\n${label}: ${text}`;

const run = async () => {
  const s = await post('/api/case-chat/start', { caseContext: { id: 'U15', title: 'Ruth — Hyperglycemic Crisis', chatMode: 'tutor' } });
  const m = await post('/api/case-chat/message', {
    sessionId: s.sessionId,
    message: prompt,
    sessionContext: { id: 'U15', hasSessionData: true, currentLocation: 'ER', labResults: [{ orderId: 'bmp', label, kind: 'lab', kindLabel: 'Lab result', text }], attendingDepth: 2 },
  });
  console.log('\n=== ATTENDING INTERPRETATION (this is what is logged to chat) ===\n' + String(m.reply || JSON.stringify(m)) + '\n');
};
run().catch((e) => { console.error('PROBE ERROR:', e.message); process.exit(1); });
