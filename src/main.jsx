import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/hanken-grotesk'
import App from './App.jsx'
import './theme.css'

// legacy #/ruta links (hash router era) -> clean URL, before React mounts
if (window.location.hash.startsWith('#/')) {
  const h = window.location.hash.slice(1)
  window.history.replaceState(null, '', h + window.location.search)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
