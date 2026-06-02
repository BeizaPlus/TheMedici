import { readCaseNotes } from './caseNotes.js';

/** Snapshot of play session for case-chat — orders, scene, notes, activity. */
export function buildChatSessionContext({
  careUnit = '',
  orderTimelineEvents = [],
  conversationLog = [],
  placed = {},
  interventions = [],
  caseId = null,
}) {
  const orders = orderTimelineEvents.map((ev, i) => ({
    seq: ev.orderIndex ?? i + 1,
    label: ev.label,
    kind: ev.kind || 'order',
    time: ev.at ? new Date(ev.at).toLocaleTimeString() : null,
  }));

  const stacksPlaced = (interventions || [])
    .filter((iv) => placed[iv.id])
    .map((iv) => iv.label);

  const sessionActivity = (conversationLog || []).slice(-50).map((e) => ({
    role: e.role,
    text: e.content,
  }));

  const learnerNotes = caseId ? readCaseNotes(caseId).trim().slice(-6000) : '';

  return {
    currentLocation: careUnit || null,
    ordersThisSession: orders,
    stacksPlaced,
    sessionActivity,
    learnerNotes: learnerNotes || null,
  };
}

export function formatChatSessionContextBlock(ctx) {
  if (!ctx || typeof ctx !== 'object') return '';
  const hasData =
    ctx.ordersThisSession?.length ||
    ctx.stacksPlaced?.length ||
    ctx.sessionActivity?.length ||
    ctx.learnerNotes ||
    ctx.currentLocation;
  if (!hasData) return '';
  return `[SESSION SO FAR — orders, notes, and scene activity for this run]\n${JSON.stringify(ctx, null, 2)}`;
}
