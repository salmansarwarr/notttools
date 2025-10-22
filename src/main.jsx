import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./global.css";
import { Buffer } from "buffer";

// Global polyfills
if (typeof window !== "undefined") {
  window.Buffer = Buffer;
  window.global = window;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
