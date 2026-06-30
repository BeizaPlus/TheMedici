import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  IconClipboardList,
  IconClipboardPulse,
  IconEyeOff,
  IconLockOpen,
  IconMargin,
  IconMessage,
  IconMoon,
  IconPill,
  IconRotate,
  IconSettings,
  IconStethoscope,
  IconLabFlask,
  IconBibliography,
} from './SceneToolbarIcons.jsx';
import CaseRecordButton from '../CaseRecordButton.jsx';

function ToolbarBtn({ active, amber, className = '', children, ...rest }) {
  return (
    <button
      type="button"
      className={`toolbar-btn${active ? ' active' : ''}${amber ? ' is-amber' : ''}${className ? ` ${className}` : ''}`}
      {...rest}
    >
      {children}
    </button>
  );
}

function ToolbarGroup({ label, children }) {
  return (
    <div className="toolbar-group" role="group" aria-label={label}>
      {children}
    </div>
  );
}

/**
 * Dock toolbar — clinical panels, chat, case actions, and display prefs in grouped clusters.
 */
export default function PlaySceneToolbar({
  examOpen,
  historyOpen,
  stacksOpen,
  chatOpen,
  showCues,
  scenePinsHidden = false,
  darkMode,
  freeDrop,
  settingsOpen,
  settingsRef,
  settingsPopover,
  bibliographyOpen = false,
  bibliographyRef,
  bibliographyPopover = null,
  showBibliography = false,
  onToggleBibliography,
  recordButtonProps,
  onToggleExam,
  onToggleLabs,
  onToggleHistory,
  onOpenStacks,
  onToggleChat,
  onRestart,
  onToggleCues,
  onToggleScenePins,
  onToggleTheme,
  onToggleDropMode,
  onToggleSettings,
  stacksDisabled = false,
  // Drop zone margin
  marginOpen = false,
  onToggleMargin,
  marginRef,
  marginPopover = null,
}) {
  // The settings popover is portaled to <body> so it can sit ABOVE the floating
  // sidebar. The toolbar lives inside .game-scene-capture (z-index:1), which traps
  // its stacking context below the sidebar — an absolutely-positioned popover here
  // would be hidden/un-clickable. Portaling escapes that trap.
  const [settingsAnchor, setSettingsAnchor] = useState(null);
  useLayoutEffect(() => {
    if (!settingsOpen) {
      setSettingsAnchor(null);
      return undefined;
    }
    const update = () => {
      const el = settingsRef?.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setSettingsAnchor({ left: r.right, top: r.top });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [settingsOpen, settingsRef]);

  return (
    <nav className="dock-toolbar-nav" aria-label="Scene controls">
      <ToolbarGroup label="Clinical panels">
        <ToolbarBtn
          active={examOpen}
          onClick={onToggleExam}
          title="Physical exam overlay"
          aria-label="Physical exam overlay"
        >
          <IconStethoscope />
        </ToolbarBtn>
        {onToggleLabs && (
          <ToolbarBtn
            onClick={onToggleLabs}
            title="Order labs"
            aria-label="Order labs"
          >
            <IconLabFlask />
          </ToolbarBtn>
        )}
        <ToolbarBtn
          active={historyOpen}
          onClick={onToggleHistory}
          title="SOAP chart overlay"
          aria-label="SOAP chart overlay"
        >
          <IconClipboardPulse />
        </ToolbarBtn>
        <ToolbarBtn
          active={stacksOpen}
          onClick={onOpenStacks}
          title="Treatment stacks"
          aria-label="Treatment stacks"
          disabled={stacksDisabled}
        >
          <IconClipboardList />
        </ToolbarBtn>
        <ToolbarBtn active={chatOpen} onClick={onToggleChat} title="Case thread" aria-label="Case thread">
          <IconMessage />
        </ToolbarBtn>
        {showBibliography && onToggleBibliography ? (
          <span className="toolbar-bibliography-wrap" ref={bibliographyRef}>
            <ToolbarBtn
              active={bibliographyOpen}
              onClick={onToggleBibliography}
              title="Bibliography & sources"
              aria-label="Bibliography and sources"
              aria-expanded={bibliographyOpen}
            >
              <IconBibliography />
            </ToolbarBtn>
            {bibliographyOpen && bibliographyPopover}
          </span>
        ) : null}
        {recordButtonProps ? (
          <CaseRecordButton {...recordButtonProps} variant="toolbar" iconOnly />
        ) : null}
      </ToolbarGroup>

      <ToolbarGroup label="Case">
        <ToolbarBtn onClick={onRestart} title="Restart case" aria-label="Restart case">
          <IconRotate />
        </ToolbarBtn>
      </ToolbarGroup>

      <ToolbarGroup label="Display and settings">
        <ToolbarBtn
          active={marginOpen}
          onClick={onToggleMargin}
          title="Scene drop margin"
          aria-label="Scene drop margin"
          aria-expanded={marginOpen}
        >
          <IconMargin />
        </ToolbarBtn>
        <ToolbarBtn
          active={scenePinsHidden}
          onClick={onToggleScenePins}
          title={scenePinsHidden ? 'Show scene stack labels' : 'Hide scene stack labels'}
          aria-label={scenePinsHidden ? 'Show scene stack labels' : 'Hide scene stack labels'}
          aria-pressed={scenePinsHidden}
        >
          <IconPill />
        </ToolbarBtn>
        <ToolbarBtn
          active={!showCues}
          onClick={onToggleCues}
          title={showCues ? 'Hide drop zone cues' : 'Show drop zone cues'}
          aria-label={showCues ? 'Hide drop zone cues' : 'Show drop zone cues'}
        >
          <IconEyeOff />
        </ToolbarBtn>
        <ToolbarBtn
          active={darkMode}
          onClick={onToggleTheme}
          title={darkMode ? 'Light mode' : 'Dark mode'}
          aria-label={darkMode ? 'Light mode' : 'Dark mode'}
        >
          <IconMoon />
        </ToolbarBtn>
        <ToolbarBtn
          active={true}
          onClick={onToggleDropMode}
          title="Fail-first: wrong orders placed & logged for review"
          aria-label="Fail-first mode: wrong orders placed for review"
        >
          <IconLockOpen />
        </ToolbarBtn>
        <span className="toolbar-settings-wrap" ref={settingsRef}>
          <ToolbarBtn
            active={settingsOpen}
            onClick={onToggleSettings}
            title="Settings"
            aria-label="Settings"
            aria-expanded={settingsOpen}
          >
            <IconSettings />
          </ToolbarBtn>
        </span>
      </ToolbarGroup>
      {settingsOpen && settingsPopover && settingsAnchor
        ? createPortal(
            <div
              className="toolbar-settings-portal"
              style={{ left: settingsAnchor.left, top: settingsAnchor.top }}
            >
              {settingsPopover}
            </div>,
            document.body,
          )
        : null}
      {marginOpen && marginPopover
        ? createPortal(
            <div className="toolbar-margin-portal">{marginPopover}</div>,
            document.body,
          )
        : null}
    </nav>
  );
}
