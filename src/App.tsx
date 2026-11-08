import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import { useEffect, useState } from "react";
import type { EventApi, EventSourceInput } from "@fullcalendar/core";
import Editor from "./Editor";
import { GROUPS, fetchEvents, getStoredPassword, login, setStoredPassword, type CalendarEvent } from "./events";

function getEventDetails(event: EventApi) {
  const sourceId = event.source?.id ?? "unknown";
  const sourceLabel = GROUPS.find((g) => g.id === sourceId)?.label ?? sourceId;
  return `${sourceLabel}: ${event.title}`;
}

type TooltipState = {
  text: string;
  x: number;
  y: number;
} | null;

const isEditPage = /\/edit\/?$/.test(window.location.pathname);

export default function App() {
  return isEditPage ? <Editor /> : <Calendar />;
}

function Calendar() {
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadError, setLoadError] = useState(false);

  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    fetchEvents().then(setEvents, () => setLoadError(true));
  }, []);

  // Show the Edit button only to someone who has signed in on this browser
  // and whose password is still valid.
  useEffect(() => {
    const password = getStoredPassword();
    if (!password) return;
    login(password).then(
      () => setCanEdit(true),
      (err: Error) => {
        if (err.message === "Wrong password") setStoredPassword(null);
      },
    );
  }, []);

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

  const eventSources: EventSourceInput[] = GROUPS.map((g) => ({
    id: g.id,
    events: events
      .filter((e) => e.groups.includes(g.id))
      .map((e) => ({ title: e.title, start: e.start })),
    color: g.color,
    textColor: "#ffffff",
  }));

  return (
    <>
      {loadError ? (
        <p className="mb-2 text-center text-sm text-red-600">Couldn't load events. Try refreshing.</p>
      ) : null}
      {canEdit ? (
        <div className="mb-2 flex justify-end">
          <a
            href={`${import.meta.env.BASE_URL}edit/`}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            Edit events
          </a>
        </div>
      ) : null}
      <div className="youth-calendar">
        <FullCalendar
          plugins={[dayGridPlugin]}
          initialView="dayGridMonth"
          timeZone="America/Denver"
          fixedWeekCount={false}
          showNonCurrentDates={false}
          headerToolbar={{
            left: "prev",
            center: "title",
            right: "next",
          }}
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
          eventSources={eventSources}
        />
      </div>
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
