import { Component, type ErrorInfo, type ReactNode } from 'react'
import ErrorPage from './ErrorPage'

/**
 * True for the one failure this app is most likely to actually hit in
 * production: the dynamic import of the scene chunk not arriving.
 *
 * It happens for two ordinary reasons. The network drops partway through
 * fetching a chunk, or a deploy replaces the hashed filenames while someone
 * still has the old page open, so the chunk the page asks for no longer
 * exists. Both are fixed by reloading, and neither is the visitor's fault —
 * which is worth telling them, because "something went wrong" invites them to
 * conclude their own machine is broken.
 *
 * Matched on message rather than type because every engine words it
 * differently and none of them subclass anything useful: Chrome says "Failed
 * to fetch dynamically imported module", Firefox "error loading dynamically
 * imported module", Safari "Importing a module script failed", and older
 * webpack-era builds "Loading chunk N failed".
 */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error)
  return /dynamically imported module|Loading chunk|Importing a module script failed|ChunkLoadError/i.test(
    message,
  )
}

interface Props {
  children: ReactNode
  /**
   * Rendered instead of the full error page when there is something better to
   * fall back to than an apology.
   *
   * The scene uses this: the site already has a complete, WebGL-free way to
   * navigate itself, so a scene that will not run should drop the visitor into
   * that rather than into a dead end. An error page is the right answer only
   * when nothing else can be offered.
   */
  fallback?: ReactNode
  /** Called with anything caught, so a future reporter has one place to hook
   *  into rather than needing this component changed. */
  onError?: (error: Error, info: ErrorInfo) => void
}

interface State {
  error: Error | null
}

/**
 * Catches a render-time throw anywhere below it and shows a page instead of
 * nothing.
 *
 * Without one of these React unmounts the entire tree on any error thrown
 * during render, and the visitor is left looking at an empty black document
 * with no message, no way back and nothing to report. That is the worst
 * outcome available and it was the default here: the site had no boundary at
 * all, while its centrepiece is a lazily loaded WebGL scene that can fail on
 * an unusual GPU, a blocked chunk, or a model that will not parse.
 *
 * It has to be a class. Hooks cannot express componentDidCatch, and React
 * still offers no function-component equivalent.
 */
export default class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // Left in deliberately. A production error with no trace anywhere is a
    // bug that gets reported as "it just went blank" and never reproduced.
    console.error('Unhandled error:', error, info.componentStack)
    this.props.onError?.(error, info)
  }

  override render() {
    const { error } = this.state
    if (!error) return this.props.children

    if (this.props.fallback) return this.props.fallback

    const chunk = isChunkLoadError(error)
    return (
      <ErrorPage
        code={chunk ? 'Offline' : 'Error'}
        title={chunk ? 'That did not finish loading.' : 'Something broke on this page.'}
        message={
          chunk
            ? 'Part of the site failed to download. That usually means the connection dropped, or a new version shipped while this page was open. Reloading fetches the current one.'
            : 'This is a fault on my side, not yours. Reloading will usually clear it; if it does not, the contact form is the fastest way to tell me what you were doing.'
        }
        action={{ label: 'Reload the page', onClick: () => window.location.reload() }}
      />
    )
  }
}
