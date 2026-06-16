import { getRecentCaseHistory as getProgressHistory, normalizeCaseProgressId } from '../data/caseProgress.js';
import { getCaseById } from '../data/useCcsCatalog.js';
import { listCasesWithChatActivity } from './recentChatCases.js';

function mergeAt(existing, candidate) {
  if (!candidate) return existing;
  if (!existing) return candidate;
  return new Date(candidate).getTime() > new Date(existing).getTime() ? candidate : existing;
}

/** Progress visits + chat-only cases, enriched with catalog titles. */
export function getCaseVisitHistory({ limit = 30 } = {}) {
  const byId = new Map();

  for (const row of getProgressHistory({ limit: limit * 2 })) {
    byId.set(row.caseId, { ...row });
  }

  for (const row of listCasesWithChatActivity({ limit: limit * 2 })) {
    const id = normalizeCaseProgressId(row.caseId);
    const prev = byId.get(id);
    if (!prev) {
      byId.set(id, {
        caseId: id,
        at: row.lastAt,
        completed: false,
        plays: 0,
        chatMessages: row.messageCount,
        source: 'chat',
      });
      continue;
    }
    byId.set(id, {
      ...prev,
      at: mergeAt(prev.at, row.lastAt),
      chatMessages: Math.max(prev.chatMessages || 0, row.messageCount || 0),
    });
  }

  return [...byId.values()]
    .filter((row) => row.at)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit)
    .map((row) => {
      const gameCase = getCaseById(row.caseId);
      return {
        ...row,
        ccsNumber: gameCase?.ccsNumber ?? row.caseId,
        title: gameCase?.title || `Case ${row.caseId}`,
      };
    });
}

export function formatCaseVisitWhen(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return String(iso);
  }
}
