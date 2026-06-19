/** Keep stack pins off the patient torso and out from under dock UI. */

const PATIENT_KEEP_OUT = { x0: 0.26, y0: 0.18, x1: 0.74, y1: 0.8 };

function isPhysicalExamPin(pin) {
  const label = String(pin?.label || '');
  const id = String(pin?.ivId || '').toLowerCase();
  return id.startsWith('phys-exam') || /^physical exam\b/i.test(label);
}

function insidePatientZone(rx, ry) {
  return (
    rx > PATIENT_KEEP_OUT.x0
    && rx < PATIENT_KEEP_OUT.x1
    && ry > PATIENT_KEEP_OUT.y0
    && ry < PATIENT_KEEP_OUT.y1
  );
}

/**
 * @param frame - { left, top, w, h } in scene percent (same as Play imageFrame * 100)
 */
export function computePinDisplayPercent(pin, zones, frame, index = 0) {
  const frameLeft = frame?.left ?? 0;
  const frameTop = frame?.top ?? 0;
  const frameW = frame?.w ?? 100;
  const frameH = frame?.h ?? 100;

  // User-dragged or free-drop position — always honor (incl. physical exam labels).
  if (pin.cx != null && pin.cy != null) {
    return {
      leftPct: pin.cx * 100,
      topPct: pin.cy * 100,
    };
  }

  let leftPct;
  let topPct;

  const z = zones?.[pin.zoneId];
  if (!z) return null;
  leftPct = frameLeft + z.cx * frameW;
  topPct = frameTop + z.cy * frameH;

  const rx = (leftPct - frameLeft) / frameW;
  const ry = (topPct - frameTop) / frameH;

  if (isPhysicalExamPin(pin)) {
    const rail = index % 2 === 0 ? 0.04 : 0.9;
    const stack = Math.floor(index / 2);
    return {
      leftPct: frameLeft + rail * frameW,
      topPct: frameTop + (0.1 + stack * 0.08) * frameH,
    };
  }

  if (!insidePatientZone(rx, ry)) {
    return { leftPct, topPct };
  }

  const toLeft = rx - PATIENT_KEEP_OUT.x0;
  const toRight = PATIENT_KEEP_OUT.x1 - rx;
  const toTop = ry - PATIENT_KEEP_OUT.y0;
  const toBottom = PATIENT_KEEP_OUT.y1 - ry;
  const min = Math.min(toLeft, toRight, toTop, toBottom);

  let nrx = rx;
  let nry = ry;
  if (min === toLeft) nrx = PATIENT_KEEP_OUT.x0 - 0.05;
  else if (min === toRight) nrx = PATIENT_KEEP_OUT.x1 + 0.05;
  else if (min === toTop) nry = PATIENT_KEEP_OUT.y0 - 0.06;
  else nry = PATIENT_KEEP_OUT.y1 + 0.06;

  return {
    leftPct: frameLeft + nrx * frameW,
    topPct: frameTop + nry * frameH,
  };
}
