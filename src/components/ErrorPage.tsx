import { PLANETS } from '../data/planets'
import { pathForSection } from '../navigation/routes'
import OutlineButton, { OutlineLink } from './OutlineButton'

export interface ErrorPageProps {
  /** Shown large. A real HTTP status where there is one, a short word where
   *  there is not — a JS crash has no status code and inventing "500" for it
   *  would be a lie the browser never told. */
  code: string
  title: string
  message: string
  /** The one thing most likely to get the visitor moving again. */
  action: { label: string; onClick: () => void }
  /** Section links. Offered on a wrong URL, where they turn a dead end into
   *  navigation, and withheld on a crash, where the app is the thing that just
   *  failed and sending someone back into it is not yet advice. */
  showSections?: boolean
}

/**
 * The shell every error state renders into.
 *
 * Deliberately outside the 3D scene. The scene is a lazily loaded chunk of
 * roughly a megabyte, and two of the three states that land here are reached
 * *because* something about loading or running it went wrong — asking for it
 * again to decorate the apology would be the same request that just failed.
 * The dithered starfield behind this is in the entry bundle and costs nothing
 * extra, so the page still belongs to the site without depending on the part
 * that broke.
 */
export default function ErrorPage({
  code,
  title,
  message,
  action,
  showSections = false,
}: ErrorPageProps) {
  return (
    <main className="error-page" id="main-content">
      <div className="error-inner">
        <p className="error-code" aria-hidden="true">
          {code}
        </p>
        {/* The only h1 on the page: the scene's visually hidden one is not
            rendered in this branch, so the document still starts at h1. */}
        <h1 className="error-title">{title}</h1>
        <p className="error-message">{message}</p>

        <div className="error-actions">
          <OutlineButton onClick={action.onClick}>{action.label}</OutlineButton>
        </div>

        {showSections && (
          <nav className="error-sections" aria-label="Sections">
            <p className="error-sections-label">Or go straight to</p>
            <ul>
              {PLANETS.map((planet) => (
                <li key={planet.id}>
                  {/* Real hrefs, so these work with middle-click, copy-link and
                      the browser's own history like any other link. */}
                  <OutlineLink href={pathForSection(planet.id)}>{planet.panel.eyebrow}</OutlineLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </main>
  )
}
