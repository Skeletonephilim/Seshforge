import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initializePersistence } from './lib/persistence-migration'

// Initialize persistence system and execute migrations if needed
// This MUST happen before React app renders
const migrationResult = initializePersistence();

if (migrationResult.success) {
  console.log('[App] Persistence initialized successfully');
} else {
  console.error('[App] Persistence initialization failed:', migrationResult.message);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
