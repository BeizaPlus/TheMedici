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
