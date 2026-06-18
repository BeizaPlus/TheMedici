import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { applyTheme, readTheme } from './lib/theme.js';
import { migrateLegacyStorage } from './lib/storageKeys.js';
import { migrateAllLegacyCaseNotes } from './lib/caseNotes.js';
import { ensurePlayUiFavoriteSeeded } from './lib/playUiFavorite.js';
import {
  readBriefingUiLayout,
  sanitizeBriefingUiLayout,
  writeBriefingUiLayout,
} from './lib/briefingUiLayout.js';
import { scrubInvalidSceneStorage } from './lib/patientImage.js';
import { applyDeviceProfile } from './lib/deviceProfile.js';
import './index.css';
import './styles/differential-practice.css';
import './ui-overrides.css';
import './styles/scene-toolbar.css';
import './styles/teach-compare-landscape.css';
import './styles/medical-sequence.css';
import './styles/case-story.css';

migrateLegacyStorage();
void migrateAllLegacyCaseNotes();
try {
  ensurePlayUiFavoriteSeeded();
  scrubInvalidSceneStorage();
  writeBriefingUiLayout(sanitizeBriefingUiLayout(readBriefingUiLayout()));
} catch {
  /* ignore */
}
applyDeviceProfile();
applyTheme(readTheme());

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
