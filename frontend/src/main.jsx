import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './lib/auth.jsx'
import { ReferenceProvider } from './lib/reference.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <ReferenceProvider>
        <App />
      </ReferenceProvider>
    </AuthProvider>
  </StrictMode>,
)
