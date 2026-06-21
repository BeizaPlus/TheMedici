import { useEffect, useMemo, useState } from 'react';
import { getCaseDifferentials } from '../lib/caseDifferentials.js';
import { renderChatMarkdown } from '../lib/chatMessageFormat.jsx';
import '../styles/differential-practice.css';

/**
 * Mobile-style differential list for play/briefing — numbered rows, tap to expand stack.
 * Pilot: U12 (Tom). Same bank source as Differential Practice mobile Teach Me.
 */
export default function CaseDifferentialStackPanel({
  caseData,
  textStyle = {},
  compact = false,
  /** Briefing / learning — list only; teaching text after Begin or in Teach Me. */
  learningSafe = false,
}) {
  const differentials = useMemo(() => getCaseDifferentials(caseData), [caseData]);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    setOpenId(null);
  }, [caseData?.id]);

  if (!differentials?.items?.length) {
    return (
      <p className="case-diff-empty clinical-text-block" style={textStyle}>
        Differential list not available for this case yet.
      </p>
    );
  }

  const toggle = (id) => setOpenId((prev) => (prev === id ? null : id));

  return (
    <div
      className={`case-diff-mobile-panel diff-teach-me${compact ? ' case-diff-mobile-panel--compact' : ''}`}
      style={textStyle}
      aria-label={differentials.title || 'Differentials'}
    >
      <div className="diff-teach-me-header">
        <span className="diff-teach-me-kicker">Differential</span>
        <h3 className="diff-teach-me-topic">{differentials.title}</h3>
        {!learningSafe && differentials.subtitle ? (
          <p className="case-diff-mobile-sub">{differentials.subtitle}</p>
        ) : null}
      </div>

      <section className="diff-teach-me-section">
        <h4 className="diff-teach-me-section-title">
          Differential ({differentials.items.length})
        </h4>
        <ol className="diff-teach-me-dd-list case-diff-mobile-list">
          {differentials.items.map((item, index) => {
            const open = openId === item.id;
            const starred =
              item.isCaseDiagnosis ||
              (differentials.diagnosis &&
                item.label.toLowerCase().trim() === differentials.diagnosis.toLowerCase().trim());

            return (
              <li
                key={item.id}
                className={`case-diff-mobile-row${open ? ' is-open' : ''}`}
              >
                <button
                  type="button"
                  className={`diff-teach-me-dd-item diff-teach-me-dd-item--tappable case-diff-mobile-item${starred ? ' diff-teach-me-dd-item--star' : ''}`}
                  onClick={() => toggle(item.id)}
                  aria-expanded={open}
                >
                  <span className="diff-teach-me-dd-num">{index + 1}</span>
                  <span className="diff-teach-me-dd-text">{item.label}</span>
                  {starred ? (
                    <span className="diff-teach-me-star" title="This case's diagnosis">
                      ★
                    </span>
                  ) : null}
                  <span className="case-diff-mobile-chevron" aria-hidden>
                    {open ? '▾' : '›'}
                  </span>
                </button>
                {open && (
                  <div className="case-diff-mobile-stack clinical-text-block">
                    {learningSafe ? (
                      item.discriminator ? (
                        <p className="case-diff-stack-discriminator">{item.discriminator}</p>
                      ) : (
                        <p className="case-diff-stack-placeholder">
                          Rule in or rule out with history, exam, and targeted workup.
                        </p>
                      )
                    ) : (
                      <>
                        {item.why ? (
                          <div className="case-diff-stack-why teach-me-text-block selectable-text">
                            {renderChatMarkdown(item.why)}
                          </div>
                        ) : (
                          <p className="case-diff-stack-placeholder">
                            Rule in or rule out with history, exam, and targeted workup — same list as
                            mobile differential practice.
                          </p>
                        )}
                        {item.discriminator ? (
                          <p className="case-diff-stack-discriminator">{item.discriminator}</p>
                        ) : null}
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
