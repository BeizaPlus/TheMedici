/** localStorage keys — internal prefix (stable across product renames). */
export const STORAGE = {
  progress: 'schoonmaker_progress',
  theme: 'schoonmaker_theme',
  patientImage: 'schoonmaker_patient_image',
  patientMime: 'schoonmaker_patient_mime',
  visionZones: 'schoonmaker_vision_zones',
  studioZones: 'schoonmaker_studio_zones',
  dropMode: 'schoonmaker_drop_mode',
  showCues: 'schoonmaker_show_cues',
  sceneVariants: 'schoonmaker_scene_variant_urls',
  caseRegenImages: 'schoonmaker_case_regen_images',
  caseAvatarSources: 'schoonmaker_case_avatar_sources',
  casePortraitBrief: 'schoonmaker_case_portrait_brief',
  captureAttempt: 'schoonmaker_capture_attempt',
  welcomePlate: 'schoonmaker_welcome_plate',
  welcomeGridItems: 'schoonmaker_welcome_grid',
  playGridItems: 'schoonmaker_play_grid',
  briefingPickerPos: 'schoonmaker_briefing_picker_pos',
  audienceProfile: 'schoonmaker_audience_profile',
  soapDraft: 'schoonmaker_soap_draft',
  clinicalTextPrefs: 'schoonmaker_clinical_text_prefs',
  refinedNarratives: 'schoonmaker_refined_narratives',
  audioPrefs: 'schoonmaker_audio_prefs',
  monitorPosition: 'schoonmaker_monitor_position',
  monitorCollapsed: 'schoonmaker_monitor_collapsed',
  playDockLayout: 'schoonmaker_play_dock_layout',
  briefingDockLayout: 'schoonmaker_briefing_dock_layout',
  briefingUiLayout: 'schoonmaker_briefing_ui_layout',
  playUiFavorite: 'schoonmaker_play_ui_favorite',
  teachCompareDockWidth: 'schoonmaker_teach_compare_dock_width',
  teachCompareLayout: 'schoonmaker_teach_compare_layout',
  playSessionTimeline: 'schoonmaker_play_session_timeline',
  threadCollapsed: 'schoonmaker_thread_collapsed',
  timelineCollapsed: 'schoonmaker_timeline_collapsed',
  caseChatHistory: 'schoonmaker_case_chat_history',
  caseNotes: 'schoonmaker_case_notes',
  caseNotesIndex: 'schoonmaker_case_notes_index',
  caseNotesMigrated: 'schoonmaker_case_notes_disk_migrated',
  activePlayCheckpoint: 'schoonmaker_active_play_checkpoint',
  uiPrefs: 'schoonmaker_ui_prefs',
  differentialPracticeLog: 'schoonmaker_differential_practice_log',
  differentialCaseTranscripts: 'schoonmaker_differential_case_transcripts',
  caseSimulationCreativity: 'schoonmaker_case_simulation_creativity',
  casePortraitPersona: 'schoonmaker_case_portrait_persona',
  caseBriefMarkdown: 'schoonmaker_case_brief_markdown',
  differentialVoiceIndex: 'schoonmaker_differential_voice_index',
  differentialCaseMemory: 'schoonmaker_differential_case_memory',
  caseYoutubeTranscripts: 'schoonmaker_case_youtube_transcripts',
  differentialStackerPrefs: 'schoonmaker_differential_stacker_prefs',
  differentialNotesSync: 'schoonmaker_differential_notes_sync',
  casePictureNotesIndex: 'schoonmaker_case_picture_notes_index',
};

const LEGACY = {
  dotphrase_progress: STORAGE.progress,
  dotphrase_theme: STORAGE.theme,
  dotphrase_patient_image: STORAGE.patientImage,
  dotphrase_patient_mime: STORAGE.patientMime,
  dotphrase_vision_zones: STORAGE.visionZones,
  dotphrase_studio_zones: STORAGE.studioZones,
  dotphrase_drop_mode: STORAGE.dropMode,
  dotphrase_show_cues: STORAGE.showCues,
  dotphrase_scene_variant_urls: STORAGE.sceneVariants,
  dotphrase_welcome_plate: STORAGE.welcomePlate,
};

/** One-time copy from DotPhrase keys so existing saves keep working. */
export function migrateLegacyStorage() {
  if (typeof window === 'undefined') return;
  try {
    for (const [oldKey, newKey] of Object.entries(LEGACY)) {
      const val = localStorage.getItem(oldKey);
      if (val != null && localStorage.getItem(newKey) == null) {
        localStorage.setItem(newKey, val);
      }
    }
    const legacyPrefix = 'dotphrase_capture_attempt_';
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith(legacyPrefix)) continue;
      const suffix = key.slice(legacyPrefix.length);
      const newKey = `${STORAGE.captureAttempt}_${suffix}`;
      if (localStorage.getItem(newKey) == null) {
        localStorage.setItem(newKey, localStorage.getItem(key));
      }
    }
    const orphan = localStorage.getItem('undefined');
    if (orphan) {
      try {
        const parsed = JSON.parse(orphan);
        if (
          parsed?.version === 1 &&
          parsed?.caseId != null &&
          !localStorage.getItem(STORAGE.activePlayCheckpoint)
        ) {
          localStorage.setItem(STORAGE.activePlayCheckpoint, orphan);
        } else if (
          parsed &&
          typeof parsed === 'object' &&
          !parsed.version &&
          Object.values(parsed).some((v) => Array.isArray(v)) &&
          !localStorage.getItem(STORAGE.caseChatHistory)
        ) {
          localStorage.setItem(STORAGE.caseChatHistory, orphan);
        } else if (
          parsed &&
          typeof parsed === 'object' &&
          !parsed.version &&
          Object.values(parsed).some((v) => typeof v === 'string') &&
          !localStorage.getItem(STORAGE.caseNotes)
        ) {
          localStorage.setItem(STORAGE.caseNotes, orphan);
        }
      } catch {
        /* ignore */
      }
      localStorage.removeItem('undefined');
    }
  } catch {
    /* ignore */
  }
}
