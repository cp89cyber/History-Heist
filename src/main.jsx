import React from "react";
import { createRoot } from "react-dom/client";
import HistoryHeist from "../history_heist_web_game_prototype.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HistoryHeist />
  </React.StrictMode>
);
