import { useState } from 'react';
import { readClinicalTextPrefs, writeClinicalTextPrefs } from '../lib/clinicalTextPrefs.js';
import {
  readTeachMeTextPrefs,
  teachMeTextStyle,
  writeTeachMeTextPrefs,
} from '../lib/teachMeTextPrefs.js';
import { STORAGE } from '../lib/storageKeys.js';
import { readUiPrefs, writeUiPrefs } from '../lib/uiPrefs.js';
import ClinicalFontControls from './ClinicalFontControls.jsx';
import SimulationCreativityControl from './SimulationCreativityControl.jsx';

function isFavoriteLayoutSaved() {
  try {
    return localStorage.getItem(STORAGE.playUiFavorite) != null;
  } catch {
    return false;
  }
}

function favoriteLayoutLabel() {
  try {
    const raw = localStorage.getItem(STORAGE.playUiFavorite);
    if (!raw) return 'Wide stacks, scene monitor dock, notes session foot.';
    const parsed = JSON.parse(raw);
    return parsed?.label ? `Favorite: ${parsed.label}` : 'Favorite play layout saved';
  } catch {
    return 'Favorite play layout saved';
  }
}

function readShowCues() {
  try {
    const raw = localStorage.getItem(STORAGE.showCues);
    return raw !== '0';
  } catch {
    return true;
  }
}

const TEACH_ME_PREVIEW =
  'Obtain a 12-lead ECG within 10 minutes. This rules out STEMI, guides antiplatelet choice, and sets the urgency for cath lab activation.';

export default function GlobalUiSettingsPanel({ embedded = false }) {
  const [textPrefs, setTextPrefs] = useState(() => readClinicalTextPrefs());
  const [teachMeTextPrefs, setTeachMeTextPrefs] = useState(() => readTeachMeTextPrefs());
  const [showCues, setShowCues] = useState(readShowCues);
  const [timedMode, setTimedMode] = useState(() => readUiPrefs().timedMode);
  const [creativityTick, setCreativityTick] = useState(0);
  const [favoriteSaved, setFavoriteSaved] = useState(isFavoriteLayoutSaved);

  const persistShowCues = (next) => {
    setShowCues(next);
    try {
      localStorage.setItem(STORAGE.showCues, next ? '1' : '0');
    } catch {
      /* ignore */
    }
  };

  const persistTimedMode = (next) => {
    setTimedMode(next);
    writeUiPrefs({ timedMode: next });
  };

  const resetAllUi = () => {
    const defaults = { fontScale: 1.12, weight: 600 };
    writeClinicalTextPrefs(defaults);
    setTextPrefs(defaults);
    const teachDefaults = { fontScale: 1, weight: 500 };
    writeTeachMeTextPrefs(teachDefaults);
    setTeachMeTextPrefs(teachDefaults);
    persistShowCues(true);
    persistTimedMode('timed');
    writeUiPrefs({ simulationCreativity: 55 });
    setCreativityTick((t) => t + 1);
  };

  return (
    <section
      className={`global-ui-settings ${embedded ? 'global-ui-settings--embedded' : ''}`}
      aria-label="Global UI settings"
    >
      <h3 className="global-ui-settings-heading">Global UI</h3>
      <p className="global-ui-settings-note">
        Text size and gameplay defaults apply across briefing, case play, and notes.
      </p>

      <div className="global-ui-settings-block">
        <p className="global-ui-settings-label">Clinical text size</p>
        <ClinicalFontControls prefs={textPrefs} onChange={setTextPrefs} showPreview />
      </div>

      <div className="global-ui-settings-block">
        <p className="global-ui-settings-label">Teach Me explanation notes</p>
        <p className="global-ui-settings-note">
          Stack rationales, Teach Me compare panel, and end-of-case order review notes.
        </p>
        <ClinicalFontControls
          prefs={teachMeTextPrefs}
          onChange={setTeachMeTextPrefs}
          writePrefs={writeTeachMeTextPrefs}
          resetTo={{ fontScale: 1, weight: 500 }}
          previewText={TEACH_ME_PREVIEW}
          labelText="Notes"
          showPreview
          styleFn={teachMeTextStyle}
          previewBlockClass="teach-me-text-block"
        />
      </div>

      <label className="global-ui-toggle">
        <input
          type="checkbox"
          checked={showCues}
          onChange={(e) => persistShowCues(e.target.checked)}
        />
        <span>Show zone cues on patient by default</span>
      </label>

      <div className="global-ui-settings-block">
        <p className="global-ui-settings-label">Case timer</p>
        <div className="global-ui-segment">
          <button
            type="button"
            className={timedMode === 'timed' ? 'active' : ''}
            onClick={() => persistTimedMode('timed')}
          >
            Timed
          </button>
          <button
            type="button"
            className={timedMode === 'untimed' ? 'active' : ''}
            onClick={() => persistTimedMode('untimed')}
          >
            Untimed
          </button>
        </div>
      </div>

      <div className="global-ui-settings-block" key={`sim-creativity-${creativityTick}`}>
        <SimulationCreativityControl
          onCreativityChange={() => setCreativityTick((t) => t + 1)}
        />
      </div>

      <div className="global-ui-settings-block">
        <p className="global-ui-settings-label">Drop mode</p>
        <p className="global-ui-settings-note">
          Fail-first: any order placed on any zone is accepted and logged. Review shows correct vs wrong placements.
        </p>
      </div>

      <div className="global-ui-settings-block">
        <p className="global-ui-settings-label">Play layout</p>
        <p className="global-ui-settings-note">
          {favoriteSaved ? favoriteLayoutLabel() : 'Wide stacks, scene monitor dock, notes session foot.'}
        </p>
        <button
          type="button"
          className="welcome-panel-btn"
          onClick={() => {
            void import('../lib/playUiFavorite.js').then(({ applyPlayUiFavorite }) => {
              applyPlayUiFavorite();
              setFavoriteSaved(true);
            });
          }}
        >
          ⭐ Save favorite play layout
        </button>
      </div>

      <button type="button" className="welcome-panel-btn" onClick={resetAllUi}>
        Reset global UI defaults
      </button>
    </section>
  );
}
