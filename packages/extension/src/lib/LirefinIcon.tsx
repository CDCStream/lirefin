/**
 * Renders the Lirefin master icon (the AI-generated `assets/lirefin-logo-v2`
 * design — open book whose pages form an ascending bar chart with a green
 * peak dot on a white squircle). Loads the bundled extension PNG via
 * `chrome.runtime.getURL`, so the same image used by the Chrome toolbar is
 * shown inside the side panel, popup, options page and FAB. Keeping a single
 * source of truth means the brand looks identical everywhere.
 */
export function LirefinIcon({
  className,
  size = 128,
}: {
  className?: string;
  size?: 16 | 32 | 48 | 128;
}) {
  return (
    <img
      src={chrome.runtime.getURL(`icons/icon-${size}.png`)}
      alt="Lirefin"
      className={`block ${className ?? ""}`.trim()}
      draggable={false}
    />
  );
}
