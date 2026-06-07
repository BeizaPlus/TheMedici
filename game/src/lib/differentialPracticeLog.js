import { STORAGE } from './storageKeys.js';

const EMPTY = { version: 1, attempts: [] };

function normalizeEntry(raw) {
  if (!raw || typeof raw !== 'object') return EMPTY;
  const attempts = Array.isArray(raw.attempts) ? raw.attempts : [];
  return { version: 1, attempts };
}

export function readDifferentialLog() {
  try {
    const raw = localStorage.getItem(STORAGE.differentialPracticeLog);
    if (!raw) return { ...EMPTY, attempts: [] };
    return normalizeEntry(JSON.parse(raw));
  } catch {
    return { ...EMPTY, attempts: [] };
  }
}

export function writeDifferentialLog(data) {
  try {
    localStorage.setItem(STORAGE.differentialPracticeLog, JSON.stringify(data, null, 2));
  } catch {
    /* ignore quota */
  }
}

function pct(correct, total) {
  if (!total) return 0;
  return Math.round((correct / total) * 100);
}

/**
 * Append one practice attempt (revealed or partial if user cycled away).
 */
export function logDifferentialAttempt({
  caseId,
  topic,
  topicIdx,
  bankSize,
  answerKey = [],
  guesses = [],
  matched = [],
  missed = [],
  extra = [],
  revealed = false,
  gotCaseDiagnosis = false,
  aiProvider = null,
  aiSummary = '',
}) {
  const total = answerKey.length;
  const correct = matched.length;
  const at = new Date().toISOString();
  const entry = {
    id: `${at}-${caseId ?? topicIdx}`,
    at,
    caseId: caseId ?? null,
    topic,
    topicIdx,
    bankSize,
    gotCaseDiagnosis,
    answerKey: [...answerKey],
    guesses: [...guesses],
    matched: [...matched],
    missed: [...missed],
    extra: [...extra],
    correct,
    total,
    pct: revealed ? pct(correct, total) : null,
    revealed,
    aiProvider: aiProvider || null,
    aiSummary: aiSummary || '',
  };

  const log = readDifferentialLog();
  log.attempts.push(entry);
  writeDifferentialLog(log);
  return entry;
}

export function getAttemptsForTopic(topic) {
  return readDifferentialLog()
    .attempts.filter((a) => a.topic === topic)
    .sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

export function getAttemptsForCase(caseId) {
  const id = String(caseId);
  return readDifferentialLog()
    .attempts.filter((a) => a.caseId != null && String(a.caseId) === id)
    .sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

export function getCaseStats(caseId) {
  const attempts = getAttemptsForCase(caseId).filter((a) => a.revealed && a.total > 0);
  if (!attempts.length) {
    return { count: 0, bestPct: null, lastPct: null, firstPct: null, improving: null, attempts: [] };
  }
  const pcts = attempts.map((a) => a.pct ?? pct(a.correct, a.total));
  const firstPct = pcts[0];
  const lastPct = pcts[pcts.length - 1];
  const bestPct = Math.max(...pcts);
  let improving = null;
  if (pcts.length >= 2) {
    if (lastPct > firstPct) improving = 'up';
    else if (lastPct < firstPct) improving = 'down';
    else improving = 'flat';
  }
  return {
    count: attempts.length,
    bestPct,
    lastPct,
    firstPct,
    improving,
    attempts,
    nailedDiagnosis: attempts.filter((a) => a.gotCaseDiagnosis).length,
  };
}

export function getTopicStats(topic) {
  const attempts = getAttemptsForTopic(topic).filter((a) => a.revealed && a.total > 0);
  if (!attempts.length) {
    return { count: 0, bestPct: null, lastPct: null, firstPct: null, improving: null };
  }
  const pcts = attempts.map((a) => a.pct ?? pct(a.correct, a.total));
  const firstPct = pcts[0];
  const lastPct = pcts[pcts.length - 1];
  const bestPct = Math.max(...pcts);
  let improving = null;
  if (pcts.length >= 2) {
    if (lastPct > firstPct) improving = 'up';
    else if (lastPct < firstPct) improving = 'down';
    else improving = 'flat';
  }
  return {
    count: attempts.length,
    bestPct,
    lastPct,
    firstPct,
    improving,
    attempts,
  };
}

export function exportDifferentialLogJson() {
  return JSON.stringify(readDifferentialLog(), null, 2);
}

export function downloadDifferentialLog() {
  const blob = new Blob([exportDifferentialLogJson()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `differential-practice-log-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
