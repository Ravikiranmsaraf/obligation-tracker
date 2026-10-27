import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import eruda from 'eruda';
if (import.meta.env.DEV || true) { // temporary 'true' so you can see it on mobile build
  eruda.init();
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
