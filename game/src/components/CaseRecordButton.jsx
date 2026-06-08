import { IconMicrophone, IconPlayerStop } from './sceneToolbar/SceneToolbarIcons.jsx';

export default function CaseRecordButton({
  recording = false,
  busy = false,
  transcribing = false,
  disabled = false,
  toggleRecording = () => {},
  className = '',
  compact = false,
  iconOnly = false,
  variant = 'default',
  listenOnly = false,
  chatMode = false,
}) {
  const isToolbar = variant === 'toolbar';
  const active = recording || (listenOnly && recording);
  const cls = isToolbar
    ? `toolbar-btn case-record-toolbar ${active ? 'active recording' : ''} ${className}`.trim()
    : `case-record-btn ${active ? 'recording' : ''} ${compact ? 'compact' : ''} ${className}`.trim();

  let label = 'Record';
  if (busy) label = 'Saving…';
  else if (transcribing) label = listenOnly ? 'Processing…' : 'Transcribing…';
  else if (recording) label = listenOnly ? 'Listening…' : 'Stop';
  else if (listenOnly) label = 'Starting mic…';

  return (
    <button
      type="button"
      className={cls}
      onClick={listenOnly ? undefined : toggleRecording}
      disabled={disabled || listenOnly}
      title={
        listenOnly
          ? 'Stacker mode — microphone stays on'
          : recording
            ? 'Stop recording — saves audio and sends transcript to case chat'
            : chatMode
              ? 'Ask the patient by voice — speech is transcribed and sent to case chat'
              : 'Record voice notes — live transcription appends to notes'
      }
      aria-label={
        listenOnly
          ? 'Microphone listening'
          : recording
            ? 'Stop recording'
            : chatMode
              ? 'Ask the patient by voice'
              : 'Record voice notes'
      }
    >
      {listenOnly || !recording ? <IconMicrophone /> : <IconPlayerStop />}
      {!iconOnly && !isToolbar && <span>{label}</span>}
    </button>
  );
}
