/** Neuron action potential — sampled curves for interactive teaching (case 135 hyperK context). */

export const AP_MV_MIN = -100;
export const AP_MV_MAX = 45;
export const AP_RESTING_MV = -75;
export const AP_THRESHOLD_MV = -55;

/** Interactive teaching phases — match First Aid neuron AP diagram. */
export const AP_PHASES = [
  {
    id: 1,
    key: 'resting',
    short: 'Resting',
    label: 'Resting membrane potential',
    t: 0.02,
    description:
      'Both voltage-gated Na⁺ and K⁺ channels closed. Membrane more permeable to K⁺ at rest — resting near −75 mV.',
    na: { activation: 'closed', inactivation: 'open' },
    k: { activation: 'closed' },
  },
  {
    id: 2,
    key: 'depolarization',
    short: 'Depolarization',
    label: 'Membrane depolarization',
    t: 0.13,
    description:
      'Na⁺ activation gate opens — Na⁺ rushes in. Membrane potential races toward threshold and peak.',
    na: { activation: 'open', inactivation: 'open' },
    k: { activation: 'closed' },
  },
  {
    id: 3,
    key: 'repolarization',
    short: 'Repolarization',
    label: 'Membrane repolarization',
    t: 0.28,
    description:
      'At peak: Na⁺ inactivation gate closes. K⁺ activation gate opens — K⁺ efflux drives potential back down.',
    na: { activation: 'closed', inactivation: 'closed' },
    k: { activation: 'open' },
  },
  {
    id: 4,
    key: 'hyperpolarization',
    short: 'Hyperpolarization',
    label: 'Membrane hyperpolarization',
    t: 0.58,
    description:
      'K⁺ gates slow to close — brief undershoot below rest. Na⁺ channels reset; Na⁺/K⁺ pump restores ion gradients.',
    na: { activation: 'closed', inactivation: 'open' },
    k: { activation: 'open-slow' },
  },
];

const KEY_MV = [
  [0, -75],
  [0.08, -58],
  [0.12, -40],
  [0.16, 20],
  [0.2, 40],
  [0.28, 15],
  [0.36, -20],
  [0.44, -60],
  [0.52, -78],
  [0.6, -92],
  [0.72, -82],
  [0.88, -76],
  [1, -75],
];

function lerpKey(keys, t) {
  const u = Math.max(0, Math.min(1, t));
  for (let i = 0; i < keys.length - 1; i += 1) {
    const [t0, v0] = keys[i];
    const [t1, v1] = keys[i + 1];
    if (u >= t0 && u <= t1) {
      const f = (u - t0) / (t1 - t0 || 1);
      return v0 + (v1 - v0) * f;
    }
  }
  return keys[keys.length - 1][1];
}

function gaussian(t, center, width) {
  const x = (t - center) / width;
  return Math.exp(-x * x);
}

export function membranePotentialMv(t, { restingOffsetMv = 0 } = {}) {
  return lerpKey(KEY_MV, t) + restingOffsetMv;
}

export function naPermeability(t) {
  return gaussian(t, 0.14, 0.06) * 0.95;
}

export function kPermeability(t) {
  return gaussian(t, 0.48, 0.14) * 0.92;
}

export function sampleActionPotentialCurves({
  steps = 64,
  restingOffsetMv = 0,
} = {}) {
  const membrane = [];
  const na = [];
  const k = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    membrane.push({ t, mv: membranePotentialMv(t, { restingOffsetMv }) });
    na.push({ t, p: naPermeability(t) });
    k.push({ t, p: kPermeability(t) });
  }
  return { membrane, na, k };
}

export function phaseById(id) {
  return AP_PHASES.find((p) => p.id === id) || AP_PHASES[0];
}

export function phaseAtT(t) {
  let best = AP_PHASES[0];
  let bestDist = Infinity;
  for (const phase of AP_PHASES) {
    const d = Math.abs(phase.t - t);
    if (d < bestDist) {
      bestDist = d;
      best = phase;
    }
  }
  return best;
}
