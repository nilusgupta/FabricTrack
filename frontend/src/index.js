import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Service worker disabled. We previously registered /sw.js as a PWA cache,
// but stale installs were serving cached 404 HTML for legacy image URLs and
// blocking the Nginx fix. /sw.js is now a one-shot kill switch that
// unregisters itself; we do not re-register it here.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((regs) => regs.forEach((r) => r.unregister()))
    .catch(() => {});
}
