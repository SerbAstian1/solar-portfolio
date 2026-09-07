import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './styles/global.css'

const container = document.getElementById('root')
if (!container) throw new Error('Root element #root is missing from index.html')

/* The prerendered fallback copy has done its job once React is mounted.
   Removing it keeps a single source of truth in the DOM, so the static block
   can never drift out of sync with what the visitor is actually looking at. */
document.getElementById('static-content')?.remove()

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    {/* The last resort. The boundary around the scene handles the failure
        that is actually likely and degrades it to the plain navigation; this
        one catches anything thrown outside that — routing, the rail, a panel —
        where the alternative is React unmounting the tree and leaving an empty
        black document with no message and nothing to report. */}
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
