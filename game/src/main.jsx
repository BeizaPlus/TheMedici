import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { applyTheme, readTheme } from './lib/theme.js';
import { migrateLegacyStorage, STORAGE } from './lib/storageKeys.js';
import {
  readBriefingUiLayout,
  sanitizeBriefingUiLayout,
  writeBriefingUiLayout,
} from './lib/briefingUiLayout.js';
import { isValidSceneSrc } from './lib/patientImage.js';
import { applyDeviceProfile } from './lib/deviceProfile.js';
import './index.css';
import './ui-overrides.css';
import './styles/scene-toolbar.css';

migrateLegacyStorage();
try {
  writeBriefingUiLayout(sanitizeBriefingUiLayout(readBriefingUiLayout()));
  const patientImg = localStorage.getItem(STORAGE.patientImage);
  if (patientImg && !isValidSceneSrc(patientImg)) {
    localStorage.removeItem(STORAGE.patientImage);
    localStorage.removeItem(STORAGE.patientMime);
  }
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
