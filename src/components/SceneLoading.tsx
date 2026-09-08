/**
 * Shown while the 3D scene is on its way.
 *
 * It covers both halves of the wait — the scene chunk downloading, and then
 * the models loading inside it — because `useGLTF` suspends and is caught by
 * the same boundary that catches the lazy import.
 *
 * There is deliberately no percentage. Real progress would have to come from
 * drei's loading manager, which lives inside the very chunk being waited on;
 * reaching for it here would pull three into the entry bundle, the one thing
 * this codebase spends real effort avoiding. The honest options were an
 * indeterminate indicator or a number invented to look reassuring, and a
 * progress bar that is lying is worse than one that admits it is only waiting.
 *
 * It does not appear immediately. The CSS delays it, so a fast connection —
 * which, now that the chunk is preloaded, is most of them — never sees it at
 * all. An indicator that flashes for a tenth of a second reads as a glitch
 * rather than as reassurance, and makes a fast load feel worse than silence.
 */
export default function SceneLoading() {
  return (
    <div className="scene-loading" role="status">
      <div className="scene-loading-inner">
        <span className="scene-loading-label">Bringing the system online</span>
        {/* The track is the full width; the segment sweeps it. Indeterminate,
            and shaped like the orbits it is waiting for. */}
        <span className="scene-loading-track" aria-hidden="true">
          <span className="scene-loading-sweep" />
        </span>
      </div>
    </div>
  )
}
