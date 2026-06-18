import { buildChatSessionContext } from './buildChatSessionContext.js';
import { buildPlacedResultRows } from './placedResultRows.js';
import { resolveOrderResult } from './orderResult.js';

/** Snapshot of play session for portrait regen — notes, exams, orders, chat. */
export function buildPortraitSessionContext({
  careUnit = '',
  orderTimelineEvents = [],
  conversationLog = [],
  placed = {},
  interventions = [],
  caseId = null,
  teachMeMode = false,
  placementOrder = [],
  interventionById = {},
  nextExpectedId = null,
  reviewResults = null,
  sessionStartedAt = null,
  pins = [],
  caseData = null,
  chatMessages = [],
}) {
  const base = buildChatSessionContext({
    careUnit,
    orderTimelineEvents,
    conversationLog,
    placed,
    interventions,
    caseId,
    teachMeMode,
    placementOrder,
    interventionById,
    nextExpectedId,
    reviewResults,
    sessionStartedAt,
  });

  const orderResults = [];
  const rows = buildPlacedResultRows({ interventions, placed, pins, interventionById });
  for (const { iv } of rows) {
    const result = resolveOrderResult(iv, { caseData, teachMeMode });
    if (!result?.text) continue;
    orderResults.push({
      label: iv.label,
      kind: result.kind,
      kindLabel: result.kindLabel,
      text: result.text,
    });
  }

  const physicalExamFindings = orderResults.filter((r) => r.kind === 'exam');
  const labResults = orderResults.filter((r) => r.kind === 'lab');
  const chatSnippet = (Array.isArray(chatMessages) ? chatMessages : [])
    .filter((m) => m?.content && (m.role === 'user' || m.role === 'assistant' || m.role === 'patient'))
    .slice(-20)
    .map((m) => ({
      role: m.role,
      content: String(m.content).slice(0, 400),
    }));

  const hasSessionData = Boolean(
    base.learnerNotes
    || (base.ordersTimeline && base.ordersTimeline.length > 0)
    || orderResults.length > 0
    || chatSnippet.length > 0
    || (base.stacksPlaced && base.stacksPlaced.length > 0),
  );

  return {
    ...base,
    orderResults,
    physicalExamFindings,
    labResults,
    chatMessages: chatSnippet,
    hasSessionData,
  };
}
