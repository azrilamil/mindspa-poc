import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { dataMode } from './data'
import './index.css'

const container = document.getElementById('root')
if (!container) throw new Error('Missing #root element.')

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary region="The app">
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

// One line in the console, so anybody opening devtools can see which backend the
// build is talking to without reading the source.
console.info(
  `MindSpa POC ready. Data layer: ${dataMode() === 'convex' ? 'Convex demo deployment' : 'local adapter, synthetic seed'}.`,
)
