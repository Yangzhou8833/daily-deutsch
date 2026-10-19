import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Route, Routes } from "react-router-dom";
import "./account";
import AccountPage from "./pages/Account";
import { AdminHome, LessonEditor } from "./pages/Admin";
import ClassBoard from "./pages/ClassBoard";
import Home from "./pages/Home";
import LessonPage from "./pages/Lesson";
import { Practice, Review } from "./pages/Practice";
import SettingsPage from "./pages/Settings";
import StatsPage from "./pages/Stats";
import "./styles.css";

// Hash routing keeps one static link working on any host (GitHub Pages has no SPA rewrites).
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/review" element={<Review />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/join/:code" element={<AccountPage />} />
        <Route path="/class" element={<ClassBoard />} />
        <Route path="/admin" element={<AdminHome />} />
        <Route path="/admin/new" element={<LessonEditor />} />
        <Route path="/admin/edit/:id" element={<LessonEditor />} />
        <Route path="/lesson/:id" element={<LessonPage />} />
        <Route path="/lesson/:id/:mode" element={<Practice />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
);
