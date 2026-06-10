import CaseSessionThread from './CaseSessionThread.jsx';

/** Unified thread — chat, typed notes, and voice record in one feed. */
export default function PlayChatNotesTabPanel({
  chat,
  caseData,
  caseId,
  playCaseId = null,
  caseRailItems = [],
  threadViewCaseId,
  onSelectThreadCase,
  caseRecording,
  notesVersion,
  onTimelineNote,
  onTimelineChat,
  suppressHeader = false,
  patientMode = false,
  onPatientModeChange,
}) {
  return (
    <CaseSessionThread
      chat={chat}
      caseData={caseData}
      caseId={caseId}
      playCaseId={playCaseId}
      caseRailItems={caseRailItems}
      threadViewCaseId={threadViewCaseId}
      onSelectThreadCase={onSelectThreadCase}
      caseRecording={suppressHeader ? null : caseRecording}
      notesVersion={notesVersion}
      onTimelineNote={onTimelineNote}
      onTimelineChat={onTimelineChat}
      fillTab
      suppressHeader={suppressHeader}
      patientMode={patientMode}
      onPatientModeChange={onPatientModeChange}
    />
  );
}
