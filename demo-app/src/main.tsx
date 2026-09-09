import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import { App } from "./App";

function NotPublic() {
  return <div className="state-message">Diese Übersicht ist nicht öffentlich. Bitte den direkten Demo-Link verwenden.</div>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<NotPublic />} />
        <Route path="/:slug" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
