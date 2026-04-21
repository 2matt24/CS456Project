import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/dark.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'

import { authTokenStore } from './services/api.js'

const API_ORIGIN = 'https://cs456project.onrender.com'
const originalFetch = window.fetch.bind(window)

window.fetch = (input, init = {}) => {
  const requestUrl = typeof input === 'string' ? input : input?.url
  const isApiRequest = typeof requestUrl === 'string' && requestUrl.startsWith(API_ORIGIN)

  if (!isApiRequest) {
    return originalFetch(input, init)
  }

  const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined) || {})
  const token = authTokenStore.get()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  


  return originalFetch(input, {
    ...init,
    //credentials,
    credentials: 'include',
    headers,
  })
}

const params = new URLSearchParams(window.location.search)
const oauthToken = params.get('authToken')
if (oauthToken) {
  authTokenStore.set(oauthToken)
  params.delete('authToken')
  const cleanQuery = params.toString()
  const cleanUrl = `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ''}${window.location.hash}`
  window.history.replaceState({}, '', cleanUrl)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
