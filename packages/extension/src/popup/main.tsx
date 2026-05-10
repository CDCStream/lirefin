import { initSentry } from "../lib/sentry.js";

initSentry("popup");

import React from "react";
import { createRoot } from "react-dom/client";
import { PopupApp } from "./PopupApp.js";
import "../styles.css";

const container = document.getElementById("root");
if (!container) throw new Error("Root container missing");

createRoot(container).render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>,
);
