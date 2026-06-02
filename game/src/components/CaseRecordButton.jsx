import { IconMicrophone, IconPlayerStop } from './sceneToolbar/SceneToolbarIcons.jsx';

export default function CaseRecordButton({
  recording = false,
  busy = false,
  transcribing = false,
  disabled = false,
  toggleRecording,
  className = '',
  compact = false,
  iconOnly = false,
  variant = 'default',
}) {
  const isToolbar = variant === 'toolbar';
  const cls = isToolbar
    ? `toolbar-btn case-record-toolbar ${recording ? 'active recording' : ''} ${className}`.trim()
    : `case-record-btn ${recording ? 'recording' : ''} ${compact ? 'compact' : ''} ${className}`.trim();

  return (
    <button
      type="button"
      className={cls}
      onClick={toggleRecording}
      disabled={disabled}
      title={
        recording
          ? 'Stop recording — saves audio and finalizes transcript'
          : 'Record voice notes — live transcription appends to notes'
      }
      aria-label={recording ? 'Stop recording' : 'Record voice notes'}
    >
      {recording ? <IconPlayerStop /> : <IconMicrophone />}
      {!iconOnly && !isToolbar && (
        <span>
          {recording ? (transcribing ? 'Transcribing…' : 'Stop') : busy ? 'Saving…' : 'Record'}
        </span>
      )}
    </button>
  );
}
