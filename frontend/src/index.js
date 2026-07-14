// Polyfills must run BEFORE pdfjs-dist (used by react-pdf) is loaded.
// Importing here at the top guarantees the polyfill executes before any
// component module pulls in @/lib/pdf.
import "@/lib/polyfills";

import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";
import { initGoogleConsentDefaults } from "@/lib/googleAnalytics";

initGoogleConsentDefaults();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);