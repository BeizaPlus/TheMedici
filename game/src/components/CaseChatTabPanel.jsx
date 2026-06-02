import { useEffect, useRef, useState } from 'react';
import { IconCopy, IconPlayerStop, IconVolume2 } from './sceneToolbar/SceneToolbarIcons.jsx';
import { renderChatMarkdown } from '../lib/chatMessageFormat.jsx';
import { readCaseAloud, stopCaseReader } from '../lib/caseReader.js';

export default function CaseChatTabPanel({ chat, caseData, compactHint = true }) {
  const { available, messages, busy, error, historyLoaded } = chat;
  const listRef = useRef(null);
  const [readingIdx, setReadingIdx] = useState(null);
  const caseId = caseData?.id;

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, busy]);

  useEffect(() => () => stopCaseReader(), []);

  const visibleMessages = messages.filter((m) => m.role === 'user' || m.role === 'assistant');

  return (
    <div className="case-chat-tab-panel">
      {compactHint && (
        <p className="case-chat-tab-hint">
          Ask from <strong>Order · Chat</strong> on the scene. History below; case notes under that.
        </p>
      )}
      {available === false && (
        <p className="case-chat-tab-banner bad">
          Add <code>DEEPSEEK_API_KEY</code> or <code>OPENAI_API_KEY</code> to <code>.env</code>, then restart the API server.
        </p>
      )}
      {error && <p className="case-chat-tab-banner bad">{error}</p>}
      <div className="case-chat-tab-messages selectable-text" ref={listRef}>
        {!historyLoaded && (
          <p className="case-chat-tab-empty">Loading chat history…</p>
        )}
        {historyLoaded && visibleMessages.length === 0 && !busy && (
          <p className="case-chat-tab-empty">No messages yet — ask about vitals, exam, differential, or workup.</p>
        )}
        {visibleMessages.map((m, i) => (
          <div key={`${m.role}-${i}-${m.content.slice(0, 24)}`} className={`case-chat-bubble ${m.role}`}>
            <span className="case-chat-bubble-text">{renderChatMarkdown(m.content)}</span>
            {m.role === 'assistant' && (
              <div className="case-chat-bubble-actions">
                <button
                  type="button"
                  className={`case-chat-bubble-btn case-chat-read-btn ${readingIdx === i ? 'is-reading' : ''}`}
                  title={readingIdx === i ? 'Stop reading' : 'Read aloud'}
                  aria-label={readingIdx === i ? 'Stop reading' : 'Read aloud'}
                  onClick={() => {
                    if (readingIdx === i) {
                      stopCaseReader();
                      setReadingIdx(null);
                    } else {
                      stopCaseReader();
                      setReadingIdx(i);
                      readCaseAloud({
                        caseId,
                        section: 'chat',
                        text: m.content,
                        onState: (state) => {
                          if (state === 'idle' || state === 'error') setReadingIdx(null);
                        },
                      });
                    }
                  }}
                >
                  {readingIdx === i ? <IconPlayerStop /> : <IconVolume2 />}
                </button>
                <button
                  type="button"
                  className="case-chat-bubble-btn case-chat-copy-btn"
                  title="Copy message"
                  aria-label="Copy message"
                  onClick={() => {
                    navigator.clipboard.writeText(m.content).catch(() => {});
                  }}
                >
                  <IconCopy />
                </button>
              </div>
            )}
          </div>
        ))}
        {busy && <div className="case-chat-bubble assistant typing">Thinking…</div>}
      </div>
    </div>
  );
}
