// Prove the attending STYLE/depth slider changes the answer to the SAME question.
// Asks one question at Brief (depth 0) and Full arc (depth 3) and shows both.
const API = process.env.PROBE_API || 'http://127.0.0.1:3002';
const post = async (p, b) => {
  const r = await fetch(`${API}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${p} ${r.status}: ${d.error || ''}`);
  return d;
};
const QUESTION = 'Why is this patient hyperkalemic?';
const ask = async (depth) => {
  const s = await post('/api/case-chat/start', { caseContext: { id: 'U15', title: 'Ruth — Hyperglycemic Crisis', chatMode: 'tutor' } });
  const m = await post('/api/case-chat/message', {
    sessionId: s.sessionId,
    message: QUESTION,
    sessionContext: { id: 'U15', hasSessionData: true, attendingDepth: depth, labResults: [{ orderId: 'bmp', label: 'BMP', kind: 'lab', kindLabel: 'Lab', text: 'K 6.2, HCO3 12, glucose 642, anion gap 22' }] },
  });
  return String(m.reply || '');
};
const run = async () => {
  for (const [name, depth] of [['BRIEF (0)', 0], ['FULL ARC (3)', 3]]) {
    const reply = await ask(depth);
    console.log(`\n===== ${name} — ${reply.split(/\s+/).length} words =====\n${reply}`);
  }
};
run().catch((e) => { console.error('PROBE ERROR:', e.message); process.exit(1); });
