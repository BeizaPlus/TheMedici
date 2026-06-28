import CaseSessionThread from './CaseSessionThread.jsx';

/** Unified thread — chat, typed notes, and voice record in one feed. */
export default function PlayChatNotesTabPanel({
  chat,
  caseData,
  caseId,
  caseRecording,
  notesVersion,
  recordingsVersion = 0,
  onTimelineNote,
  onTimelineChat,
  suppressHeader = false,
  messagesOnly = false,
  compact = false,
  dockRole,
  onDockRoleChange,
  patientMode = false,
  defaultChatTarget = 'notes',
  onPatientModeChange,
  browseOnly = false,
  teachMeMode = false,
}) {
  return (
    <CaseSessionThread
      chat={chat}
      caseData={caseData}
      caseId={caseId}
      caseRecording={suppressHeader ? null : caseRecording}
      notesVersion={notesVersion}
      recordingsVersion={recordingsVersion}
      onTimelineNote={onTimelineNote}
      onTimelineChat={onTimelineChat}
      fillTab
      suppressHeader={suppressHeader}
      messagesOnly={messagesOnly}
      compact={compact}
      dockRole={dockRole}
      onDockRoleChange={onDockRoleChange}
      patientMode={patientMode}
      defaultChatTarget={defaultChatTarget}
      onPatientModeChange={onPatientModeChange}
      browseOnly={browseOnly}
      teachMeMode={teachMeMode}
    />
  );
}
