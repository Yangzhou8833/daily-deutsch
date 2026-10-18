import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import LessonPage from "./pages/Lesson";
import { Practice, Review } from "./pages/Practice";
import "./styles.css";

// Hash routing keeps one static link working on any host (GitHub Pages has no SPA rewrites).
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/review" element={<Review />} />
        <Route path="/lesson/:id" element={<LessonPage />} />
        <Route path="/lesson/:id/:mode" element={<Practice />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
);
