import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Calendar from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="mx-4 flex min-h-dvh max-w-6xl flex-col sm:mx-auto">
      <div className="flex shrink-0 items-center justify-center pb-2 pt-4 sm:pb-8 sm:pt-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Youth Calendar</h1>
      </div>
      <div className="min-h-0 flex-1 sm:flex-none">
        <Calendar />
      </div>
    </div>
  </StrictMode>,
);
