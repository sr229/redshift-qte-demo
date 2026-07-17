import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@pxlkit/ui-kit/styles.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
