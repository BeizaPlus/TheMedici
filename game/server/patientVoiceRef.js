import fs from 'fs';
import path from 'path';

const CHATTERBOX_ROOT =
  process.env.CHATTERBOX_ROOT ||
  path.join(process.env.USERPROFILE || process.env.HOME || '', 'chatterbox');

const DEFAULT_MALE_REF = path.join(CHATTERBOX_ROOT, 'VoiceClone_STEF_AMP_under25MB.flac');

function wantsDefaultVoice(value) {
  const key = String(value || '').trim().toLowerCase();
  return !key || key === 'none' || key === 'default' || key === 'unprompted';
}

function resolveEnvPath(value) {
  if (wantsDefaultVoice(value)) return 'none';
  const p = path.resolve(String(value).trim());
  if (!fs.existsSync(p)) {
    throw new Error(`Voice reference not found: ${p}`);
  }
  return p;
}

/**
 * Chatterbox Turbo has one unprompted default when ref is "none".
 * Gender-matched speech uses short clone clips via env (or Stef male default on this machine).
 */
export function resolveVoiceRefForProfile(voiceProfile = 'narrator') {
  const profile = String(voiceProfile || 'narrator').trim().toLowerCase();

  if (profile === 'narrator' || profile === 'default' || profile === 'read-case') {
    return process.env.CHATTERBOX_VOICE_REF || '';
  }

  const envByProfile = {
    'patient-male': 'CHATTERBOX_PATIENT_VOICE_MALE',
    'patient-female': 'CHATTERBOX_PATIENT_VOICE_FEMALE',
    'patient-child': 'CHATTERBOX_PATIENT_VOICE_CHILD',
  };

  const envKey = envByProfile[profile];
  if (!envKey) return process.env.CHATTERBOX_VOICE_REF || '';

  const fromEnv = process.env[envKey];
  if (fromEnv) return resolveEnvPath(fromEnv);

  if (profile === 'patient-male' && fs.existsSync(DEFAULT_MALE_REF)) {
    return DEFAULT_MALE_REF;
  }

  return 'none';
}

export function listPatientVoiceConfig() {
  const male = process.env.CHATTERBOX_PATIENT_VOICE_MALE || (fs.existsSync(DEFAULT_MALE_REF) ? DEFAULT_MALE_REF : 'none');
  const female = process.env.CHATTERBOX_PATIENT_VOICE_FEMALE || 'none';
  const child = process.env.CHATTERBOX_PATIENT_VOICE_CHILD || 'none';
  return {
    narrator: process.env.CHATTERBOX_VOICE_REF || 'none',
    patientMale: male,
    patientFemale: female,
    patientChild: child,
    note:
      'Chatterbox Turbo: one unprompted default voice, or voice-clone from a short reference clip. Set CHATTERBOX_PATIENT_VOICE_FEMALE to a .flac/.wav for female patients.',
  };
}
