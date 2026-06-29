import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

// 渲染前先定主题，避免闪一下
const saved = localStorage.getItem('nova-theme')
const dark = saved ? saved === 'dark' : window.matchMedia?.('(prefers-color-scheme: dark)').matches
document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
