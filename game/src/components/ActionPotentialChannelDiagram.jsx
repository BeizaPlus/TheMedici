/** Voltage-gated Na⁺ / K⁺ channel cross-section for AP phase teaching. */

function NaChannel({ na, compact }) {
  const actOpen = na.activation === 'open';
  const inactClosed = na.inactivation === 'closed';
  const w = compact ? 52 : 64;
  const h = compact ? 72 : 88;
  return (
    <svg className="ap-channel-svg" viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <rect x="4" y="8" width={w - 8} height={h - 16} rx="4" className="ap-channel-membrane" />
      <path
        d={`M ${w * 0.35} 12 L ${w * 0.35} ${h - 12}`}
        className="ap-channel-pore ap-channel-pore--na"
      />
      <circle
        cx={w * 0.38}
        cy={inactClosed ? h * 0.42 : h * 0.22}
        r={compact ? 5 : 6}
        className={`ap-channel-ball${inactClosed ? ' is-blocked' : ''}`}
      />
      <rect
        x={w * 0.28}
        y={actOpen ? h * 0.52 : h * 0.46}
        width={w * 0.14}
        height={actOpen ? h * 0.22 : 4}
        rx="2"
        className={`ap-channel-gate ap-channel-gate--na-act${actOpen ? ' is-open' : ''}`}
      />
      {!compact && (
        <>
          <text x={w * 0.5} y={h - 4} className="ap-channel-label">
            Na⁺
          </text>
          <text x={w * 0.5} y="10" className="ap-channel-sublabel">
            {actOpen ? 'activation open' : 'activation closed'}
          </text>
        </>
      )}
      {actOpen && (
        <path
          d={`M ${w * 0.55} ${h * 0.35} L ${w * 0.72} ${h * 0.28}`}
          className="ap-ion-flow ap-ion-flow--na"
          markerEnd="url(#ap-arrow-na)"
        />
      )}
      <defs>
        <marker id="ap-arrow-na" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
          <path d="M0,0 L4,2 L0,4 Z" className="ap-ion-arrow" />
        </marker>
      </defs>
    </svg>
  );
}

function KChannel({ k, compact }) {
  const actOpen = k.activation === 'open' || k.activation === 'open-slow';
  const slow = k.activation === 'open-slow';
  const w = compact ? 52 : 64;
  const h = compact ? 72 : 88;
  return (
    <svg className="ap-channel-svg" viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <rect x="4" y="8" width={w - 8} height={h - 16} rx="4" className="ap-channel-membrane" />
      <path
        d={`M ${w * 0.35} 12 L ${w * 0.35} ${h - 12}`}
        className="ap-channel-pore ap-channel-pore--k"
      />
      <rect
        x={w * 0.28}
        y={actOpen ? h * 0.38 : h * 0.46}
        width={w * 0.14}
        height={actOpen ? (slow ? h * 0.28 : h * 0.24) : 4}
        rx="2"
        className={`ap-channel-gate ap-channel-gate--k${actOpen ? ' is-open' : ''}${slow ? ' is-slow' : ''}`}
      />
      {!compact && (
        <>
          <text x={w * 0.5} y={h - 4} className="ap-channel-label">
            K⁺
          </text>
          <text x={w * 0.5} y="10" className="ap-channel-sublabel">
            {actOpen ? (slow ? 'slow close' : 'activation open') : 'closed'}
          </text>
        </>
      )}
      {actOpen && (
        <path
          d={`M ${w * 0.28} ${h * 0.55} L ${w * 0.12} ${h * 0.62}`}
          className="ap-ion-flow ap-ion-flow--k"
          markerEnd="url(#ap-arrow-k)"
        />
      )}
      <defs>
        <marker id="ap-arrow-k" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
          <path d="M0,0 L4,2 L0,4 Z" className="ap-ion-arrow-k" />
        </marker>
      </defs>
    </svg>
  );
}

export default function ActionPotentialChannelDiagram({ phase, compact = false }) {
  if (!phase) return null;
  return (
    <div className={`ap-channel-diagram${compact ? ' ap-channel-diagram--compact' : ''}`}>
      <NaChannel na={phase.na} compact={compact} />
      <KChannel k={phase.k} compact={compact} />
    </div>
  );
}
