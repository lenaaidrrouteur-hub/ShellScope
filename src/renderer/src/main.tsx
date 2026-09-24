import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles.css";

if (import.meta.env.DEV) {
  void import("react-grab");
  void import("react-scan");
}

const root = document.getElementById("root");
if (root === null) throw new Error("Élément racine introuvable");
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
