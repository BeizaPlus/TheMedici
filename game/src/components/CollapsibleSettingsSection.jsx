/** Collapsible block for settings popovers — closed until opened. */
export default function CollapsibleSettingsSection({
  title,
  defaultOpen = false,
  className = '',
  children,
}) {
  return (
    <details
      className={`settings-collapsible${className ? ` ${className}` : ''}`}
      open={defaultOpen || undefined}
    >
      <summary className="settings-collapsible-summary">{title}</summary>
      <div className="settings-collapsible-body">{children}</div>
    </details>
  );
}
