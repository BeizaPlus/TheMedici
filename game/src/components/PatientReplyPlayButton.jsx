import { useState } from 'react';
import { IconPlayerStop, IconVolume2 } from './sceneToolbar/SceneToolbarIcons.jsx';
import { speakPatientReply } from '../lib/patientSpeech.js';
import { stopCaseReader } from '../lib/caseReader.js';

/** Play Chatterbox patient dialogue — text shows first; tap ▶ to hear. */
export default function PatientReplyPlayButton({
  caseData,
  text,
  section = 'patient-chat',
  className = '',
  compact = false,
}) {
  const [playing, setPlaying] = useState(false);

  if (!text?.trim()) return null;

  return (
    <button
      type="button"
      className={`case-chat-bubble-btn case-chat-read-btn patient-reply-play-btn${playing ? ' is-reading' : ''} ${className}`.trim()}
      title={playing ? 'Stop patient voice' : 'Play patient voice (Chatterbox)'}
      aria-label={playing ? 'Stop' : 'Play patient reply'}
      onClick={() => {
        if (playing) {
          stopCaseReader();
          setPlaying(false);
          return;
        }
        stopCaseReader();
        setPlaying(true);
        void speakPatientReply({
          caseData,
          text,
          section,
          force: true,
          onState: (state) => {
            if (state === 'idle' || state === 'error') setPlaying(false);
          },
        });
      }}
    >
      {playing ? <IconPlayerStop /> : <IconVolume2 />}
      {!compact && <span>{playing ? 'Stop' : 'Play'}</span>}
    </button>
  );
}
