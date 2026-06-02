import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { applyTheme, readTheme } from './lib/theme.js';
import { migrateLegacyStorage } from './lib/storageKeys.js';
import { ensurePlayUiFavoriteSeeded } from './lib/playUiFavorite.js';
import {
  readBriefingUiLayout,
  sanitizeBriefingUiLayout,
  writeBriefingUiLayout,
} from './lib/briefingUiLayout.js';
import { scrubInvalidSceneStorage } from './lib/patientImage.js';
import { applyDeviceProfile } from './lib/deviceProfile.js';
import './index.css';
import './ui-overrides.css';
import './styles/scene-toolbar.css';

migrateLegacyStorage();
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
