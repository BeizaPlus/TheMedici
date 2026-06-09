import { useEffect, useMemo, useState } from 'react';

import DifferentialAttemptHistory from './DifferentialAttemptHistory.jsx';

import DifferentialReviewPanel from './DifferentialReviewPanel.jsx';

import DifferentialRealWorldPanel from './DifferentialRealWorldPanel.jsx';

import CasePresentationPanel from './CasePresentationPanel.jsx';

import { openCcsScreenshot } from '../lib/ccsScreenshot.js';

import { getRealWorldStories } from '../lib/realWorldCases.js';



const TABS = [

  { id: 'timeline', label: 'Timeline' },

  { id: 'case', label: 'Case' },

  { id: 'realworld', label: 'Real World' },

];



export default function DifferentialStudyPanel({

  caseId,

  caseStats,

  caseRef,

  hasReviewText,

  ccsReview,

  presentationIntro,

  presentationHistory,

  presentationVitals,

  fallbackHistory,

  hasCaseData,

  diagnosis = '',

  topic = '',

}) {

  const [tab, setTab] = useState('timeline');



  const realWorld = useMemo(

    () =>

      getRealWorldStories({

        caseId,

        diagnosis: diagnosis || ccsReview?.diagnosis || '',

        topic,

      }),

    [caseId, diagnosis, ccsReview?.diagnosis, topic],

  );



  const hasRealWorld = realWorld.hasCurated;



  useEffect(() => {

    setTab(caseStats?.count ? 'timeline' : hasReviewText || hasCaseData ? 'case' : 'timeline');

  }, [caseId, caseStats?.count, hasReviewText, hasCaseData]);



  const showTimeline = Boolean(caseStats?.count);

  const showCase = hasReviewText || hasCaseData;



  return (

    <section className="diff-study-panel" aria-label="Practice timeline and CCS case reference">

      <div className="diff-study-tabs" role="tablist">

        {TABS.map((t) => (

          <button

            key={t.id}

            type="button"

            role="tab"

            className={`diff-study-tab${tab === t.id ? ' diff-study-tab--active' : ''}`}

            aria-selected={tab === t.id}

            onClick={() => setTab(t.id)}

          >

            {t.label}

            {t.id === 'timeline' && caseStats?.count > 0 && (

              <span className="diff-study-tab-badge">{caseStats.count}</span>

            )}

            {t.id === 'realworld' && hasRealWorld && (

              <span className="diff-study-tab-badge diff-study-tab-badge--gold">

                {realWorld.stories.length}

              </span>

            )}

          </button>

        ))}

      </div>



      <div className="diff-study-body" role="tabpanel">

        {tab === 'timeline' && (

          <>

            {showTimeline ? (

              <DifferentialAttemptHistory caseId={caseId} caseStats={caseStats} embedded />

            ) : (

              <p className="diff-study-empty">

                No practice attempts for Case {caseId} yet. Reveal &amp; score to build your timeline.

              </p>

            )}

          </>

        )}



        {tab === 'case' && (

          <>

            {caseRef && (

              <div className="diff-study-case-actions">

                <button

                  type="button"

                  className="diff-case-ref-btn diff-case-ref-btn--shot"

                  onClick={() => openCcsScreenshot(caseRef.ccsNumber ?? caseRef.id)}

                >

                  CCS screenshot ↗

                </button>

              </div>

            )}

            {hasReviewText && ccsReview ? (

              <DifferentialReviewPanel review={ccsReview} className="diff-case-review" />

            ) : hasCaseData ? (

              <CasePresentationPanel

                intro={presentationIntro}

                history={fallbackHistory || presentationHistory}

                vitals={presentationVitals}

                className="diff-case-presentation"

              />

            ) : (

              <p className="diff-study-empty">

                No CCS review text for Case {caseId}. Use CCS screenshot if available.

              </p>

            )}

          </>

        )}



        {tab === 'realworld' && (
          <DifferentialRealWorldPanel
            caseId={caseId}
            curatedStories={realWorld.stories}
            searchUrl={realWorld.searchUrl}
            diagnosis={diagnosis || ccsReview?.diagnosis || ''}
            topic={topic}
            chiefComplaint={ccsReview?.chiefComplaint || ''}
            hpiSnippet={ccsReview?.hpiNarrative || ccsReview?.history || ''}
            active={tab === 'realworld'}
          />
        )}

      </div>

    </section>

  );

}

