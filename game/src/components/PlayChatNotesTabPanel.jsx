import CaseSessionThread from './CaseSessionThread.jsx';

/** Unified thread — chat, typed notes, and voice record in one feed. */
export default function PlayChatNotesTabPanel({
  chat,
  caseData,
  caseId,
  caseRecording,
  notesVersion,
  onTimelineNote,
  onTimelineChat,
}) {
  return (
    <CaseSessionThread
      chat={chat}
      caseData={caseData}
      caseId={caseId}
      caseRecording={caseRecording}
      notesVersion={notesVersion}
      onTimelineNote={onTimelineNote}
      onTimelineChat={onTimelineChat}
      fillTab
    />
  );
}
