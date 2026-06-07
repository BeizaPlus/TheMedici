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
            ? 'Stop recording — saves audio and finalizes transcript'
            : 'Record voice notes — live transcription appends to notes'
      }
      aria-label={listenOnly ? 'Microphone listening' : recording ? 'Stop recording' : 'Record voice notes'}
    >
      {listenOnly || !recording ? <IconMicrophone /> : <IconPlayerStop />}
      {!iconOnly && !isToolbar && <span>{label}</span>}
    </button>
  );
}
