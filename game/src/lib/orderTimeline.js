const ORDER_EVENT_TYPES = new Set(['stack', 'extra_order', 'location']);

export function isOrderTimelineEvent(event) {
  return ORDER_EVENT_TYPES.has(event?.type);
}

export function orderTimelineEntryFromEvent(event, { orderIndex = null } = {}) {
  if (!event) return null;
  const at = Date.now();
  if (event.type === 'stack') {
    return {
      id: `order-${at}-${event.stackId || event.label}`,
      at,
      label: event.label || 'Order',
      kind: 'order',
      orderIndex,
    };
  }
  if (event.type === 'extra_order') {
    return {
      id: `extra-${at}-${event.label}`,
      at,
      label: event.label || 'Order',
      kind: 'extra',
      orderIndex,
    };
  }
  if (event.type === 'location') {
    return {
      id: `xfer-${at}-${event.location || event.label}`,
      at,
      label: event.label || `Transfer to ${event.location}`,
      kind: 'transfer',
      orderIndex: null,
    };
  }
  return null;
}

export function rebuildOrderTimelineFromCheckpoint({
  placementOrder = [],
  extraOrders = [],
  interventionById = {},
  sessionStartedAt = Date.now(),
}) {
  const events = [];
  placementOrder.forEach((stackId, idx) => {
    const iv = interventionById[stackId];
    events.push({
      id: `resume-order-${stackId}`,
      at: sessionStartedAt + (idx + 1) * 1000,
      label: iv?.label || stackId,
      kind: 'order',
      orderIndex: idx + 1,
    });
  });
  const base = sessionStartedAt + placementOrder.length * 1000;
  extraOrders.forEach((order, idx) => {
    events.push({
      id: `resume-extra-${order.name}-${idx}`,
      at: base + (idx + 1) * 1000,
      label: order.name,
      kind: 'extra',
      orderIndex: placementOrder.length + idx + 1,
    });
  });
  return events;
}

export function orderTimelineFromServerSession(session) {
  if (!session?.timeline?.length) return [];
  const startedMs = session.startedAt ? new Date(session.startedAt).getTime() : Date.now();
  let orderIndex = 0;
  return session.timeline
    .map((ev) => {
      const at = ev.at ? new Date(ev.at).getTime() : startedMs;
      if (ev.type === 'stack') {
        orderIndex += 1;
        return {
          id: `srv-stack-${ev.stackId || ev.label}-${at}`,
          at,
          label: ev.label || 'Order',
          kind: 'order',
          orderIndex,
        };
      }
      if (ev.type === 'extra_order') {
        orderIndex += 1;
        return {
          id: `srv-extra-${ev.label}-${at}`,
          at,
          label: ev.label || 'Order',
          kind: 'extra',
          orderIndex,
        };
      }
      if (ev.type === 'location') {
        return {
          id: `srv-xfer-${ev.location || ev.label}-${at}`,
          at,
          label: ev.label || `Transfer to ${ev.location}`,
          kind: 'transfer',
          orderIndex: null,
        };
      }
      return null;
    })
    .filter(Boolean);
}

/** Prefer the timeline with more order rows; merge unique ids when equal length. */
export function pickBestOrderTimeline(...candidates) {
  const lists = candidates
    .filter((rows) => Array.isArray(rows) && rows.length)
    .map((rows) => [...rows]);
  if (!lists.length) return [];
  lists.sort((a, b) => b.length - a.length);
  const best = [...lists[0]];
  const seen = new Set(best.map((ev) => ev.id));
  for (let i = 1; i < lists.length; i += 1) {
    for (const ev of lists[i]) {
      if (!seen.has(ev.id)) {
        seen.add(ev.id);
        best.push(ev);
      }
    }
  }
  return best.sort((a, b) => (a.at || 0) - (b.at || 0));
}
