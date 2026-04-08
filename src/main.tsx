import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Calendar from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="max-w-6xl mx-4 sm:mx-auto">
      <div className="pt-8 pb-8 flex items-center justify-center">
        <h1 className="text-3xl font-bold">Youth Calendar</h1>
      </div>
      <Calendar />
    </div>
  </StrictMode>,
);
