import { readAudioPrefs } from './audioPrefs.js';
import { readCaseAloud } from './caseReader.js';
import { resolvePatientDemographics } from './patientFactsFromHpi.js';
import { inferPatientSex } from './patientSex.js';

/** Voice profile key sent to /api/read-case (maps to Chatterbox clone ref on server). */
export function patientVoiceProfile(caseData) {
  const demo = resolvePatientDemographics(caseData || {});
  if (demo.speakAsChild) return 'patient-child';
  return inferPatientSex(caseData) === 'female' ? 'patient-female' : 'patient-male';
}

export function shouldAutoSpeakPatient() {
  const prefs = readAudioPrefs();
  if (prefs.voiceMuted) return false;
  return prefs.patientAutoSpeak !== false;
}

/** Speak a patient_sim reply with sex-matched Chatterbox voice (browser fallback if offline). */
export function speakPatientReply({ caseData, text, section = 'patient-chat', onState }) {
  const trimmed = String(text || '').trim();
  if (!trimmed || !shouldAutoSpeakPatient()) return Promise.resolve();

  return readCaseAloud({
    caseId: caseData?.id,
    section,
    text: trimmed,
    voiceProfile: patientVoiceProfile(caseData),
    onState,
  });
}
