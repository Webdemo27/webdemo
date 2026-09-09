import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import { Layout } from "./routes/Layout";
import { HomePage } from "./routes/HomePage";
import { LeistungenPage } from "./routes/LeistungenPage";
import { UeberUnsPage } from "./routes/UeberUnsPage";
import { KontaktPage } from "./routes/KontaktPage";

function NotPublic() {
  return <div className="state-message">Diese Übersicht ist nicht öffentlich. Bitte den direkten Demo-Link verwenden.</div>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<NotPublic />} />
        <Route path="/:slug" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="leistungen" element={<LeistungenPage />} />
          <Route path="ueber-uns" element={<UeberUnsPage />} />
          <Route path="kontakt" element={<KontaktPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
