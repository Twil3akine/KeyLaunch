import React from "react";
import ReactDOM from 'react-dom/client';
import App from "./App";

const mountPoint = document.createElement("div");
document.body.appendChild(mountPoint);

ReactDOM.createRoot(mountPoint).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)