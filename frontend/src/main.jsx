import React from 'react'
import ReactDOM from 'react-dom/client'
import { HeroUIProvider } from "@heroui/react";
import { HashRouter } from 'react-router-dom'; // <--- IMPORT THIS
import App from './app'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HeroUIProvider>
      <main className="dark text-foreground bg-background h-screen">
        {/* HashRouter is REQUIRED for Electron to work without a white screen */}
        <HashRouter>
           <App />
        </HashRouter>
      </main>
    </HeroUIProvider>
  </React.StrictMode>,
)