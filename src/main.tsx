import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/design.css'
import './styles/app.css'
import sprite from './sprite.svg?raw'

const spriteHost = document.createElement('div')
spriteHost.style.display = 'none'
spriteHost.innerHTML = sprite
document.body.prepend(spriteHost)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
