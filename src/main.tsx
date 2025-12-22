import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Remove the loading shell once React mounts
const loadingShell = document.getElementById('app-loading');
if (loadingShell) {
  loadingShell.remove();
}

// Register service worker for offline capability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // The service worker is automatically registered by vite-plugin-pwa
    // This ensures all assets are cached for offline use
    console.log('[PWA] Service worker support detected');
  });
}

createRoot(document.getElementById("root")!).render(<App />);
