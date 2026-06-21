import { buildCaseBibliography } from '../lib/caseBibliography.js';

export default function CaseBibliographyPanel({ caseData, compact = false }) {
  const { sections } = buildCaseBibliography(caseData);

  if (!sections.length) {
    return (
      <p className="case-bibliography-empty">
        No curated references for this case yet. Attending sources and First Aid pages appear here when
        the playbook cites them.
      </p>
    );
  }

  return (
    <div className={`case-bibliography-panel${compact ? ' case-bibliography-panel--compact' : ''}`}>
      {sections.map((section) => (
        <section key={section.id} className="case-bibliography-section">
          <div className="case-bibliography-section-head">
            <h4 className="case-bibliography-section-title">{section.title}</h4>
            {section.pdfUrl ? (
              <a
                className="case-bibliography-pdf-link"
                href={section.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open First Aid PDF
              </a>
            ) : null}
          </div>
          <ul className="case-bibliography-list">
            {section.items.map((item) => (
              <li key={item.id} className={`case-bibliography-item kind-${item.kind || 'default'}`}>
                <div className="case-bibliography-item-head">
                  {item.href ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="case-bibliography-item-label"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <span className="case-bibliography-item-label">{item.label}</span>
                  )}
                  {item.ref ? <span className="case-bibliography-item-ref">{item.ref}</span> : null}
                </div>
                {item.note ? <p className="case-bibliography-item-note">{item.note}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
