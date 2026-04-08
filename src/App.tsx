import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import { useEffect, useState } from "react";
import type { EventApi } from "@fullcalendar/core";

const sourceLabels: Record<string, string> = {
  deacons: "Deacons",
  teachers: "Teachers",
  priests: "Priests",
  combinedYoungMenEvents: "Combined Young Men",
  combinedAllYouthEvents: "Combined All Youth",
};

function getEventDetails(event: EventApi) {
  const sourceId = event.source?.id ?? "unknown";
  const sourceLabel = sourceLabels[sourceId] ?? sourceId;
  return `${sourceLabel}: ${event.title}`;
}

type TooltipState = {
  text: string;
  x: number;
  y: number;
} | null;

const deaconsEvents = [
  { title: "China Night", start: "2026-04-14" },
  { title: "Bowling", start: "2026-04-28" },
  { title: "Service Project", start: "2026-05-12" },
  { title: "Meat Fest", start: "2026-06-12" },
  { title: "Devotional with Q&A", start: "2026-06-23" },
];

const teachersEvents = [
  { title: "China Night", start: "2026-04-14" },
  { title: "Family History", start: "2026-04-28" },
  { title: "Hike to the Star", start: "2026-05-12" },
  { title: "Meat Fest", start: "2026-06-12" },
  { title: "Devotional with Q&A", start: "2026-06-23" },
];

const priestsEvents = [
  { title: "Missionary Training (in Montpelier)", start: "2026-04-15" },
  { title: "Service: Yard Work", start: "2026-04-28" },
  { title: "Board Games", start: "2026-05-12" },
  { title: "Hiking", start: "2026-06-09" },
  { title: "Golf", start: "2026-06-23" },
];

const combinedYoungMenEvents = [
  { title: "Paintball", start: "2026-05-05" },
  { title: "Bridge Jumping", start: "2026-06-30" },
  { title: "Fishing", start: "2026-05-26" },
];
const combinedAllYouthEvents = [
  { title: "Human Battleship", start: "2026-04-21" },
  { title: "TBA (YW In Charge)", start: "2026-05-19" },
  { title: "Temple Trip", start: "2026-06-02" },
  { title: "Ultimate Frisbee", start: "2026-06-16" },
];

export default function Calendar() {
  const [tooltip, setTooltip] = useState<TooltipState>(null);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (target.closest('[data-role="event-tooltip"]')) return;
      if (target.closest(".fc-event")) return;

      setTooltip(null);
    };

    document.addEventListener("click", onDocumentClick);
    return () => {
      document.removeEventListener("click", onDocumentClick);
    };
  }, []);

  return (
    <>
      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        eventDidMount={(info) => {
          info.el.style.cursor = "pointer";
        }}
        eventClick={(info) => {
          info.jsEvent.preventDefault();

          const rect = info.el.getBoundingClientRect();
          const tooltipWidth = 260;
          const horizontalPadding = 12;
          const maxX = window.innerWidth - tooltipWidth - horizontalPadding;
          const desiredX = rect.left + rect.width / 2 - tooltipWidth / 2;
          const x = Math.max(horizontalPadding, Math.min(desiredX, maxX));

          const y = Math.max(8, rect.top - 12);

          setTooltip({
            text: getEventDetails(info.event),
            x,
            y,
          });
        }}
        eventSources={[
          {
            id: "deacons",
            events: deaconsEvents,
            color: "#16a34a",
            textColor: "#ffffff",
          },
          {
            id: "teachers",
            events: teachersEvents,
            color: "#dc2626",
            textColor: "#ffffff",
          },
          {
            id: "priests",
            events: priestsEvents,
            color: "#2563eb",
            textColor: "#ffffff",
          },
          {
            id: "combinedYoungMenEvents",
            events: combinedYoungMenEvents,
            color: "#e8c243",
            textColor: "#ffffff",
          },
          {
            id: "combinedAllYouthEvents",
            events: combinedAllYouthEvents,
            color: "#4703ad",
            textColor: "#ffffff",
          },
        ]}
      />
      {tooltip ? (
        <div
          data-role="event-tooltip"
          className="pointer-events-auto fixed z-50 w-[260px] -translate-y-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-lg"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
          }}
        >
          {tooltip.text}
        </div>
      ) : null}
    </>
  );
}
