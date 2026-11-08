export const GROUPS = [
  { id: "deacons", label: "Deacons", color: "#16a34a" },
  { id: "teachers", label: "Teachers", color: "#dc2626" },
  { id: "priests", label: "Priests", color: "#2563eb" },
  { id: "combinedYoungMen", label: "Combined YM", color: "#e8c243" },
  { id: "combinedAllYouth", label: "Combined YM/YW", color: "#4703ad" },
] as const;

export type GroupId = (typeof GROUPS)[number]["id"];

export type CalendarEvent = {
  title: string;
  start: string; // YYYY-MM-DD
  groups: GroupId[];
};

const API_URL =
  import.meta.env.VITE_EVENTS_API ?? "https://youth-calendar-api.rasmussen-technical-advisory.workers.dev";

/** Live data from the Worker, falling back to the copy bundled with the site. */
export async function fetchEvents(): Promise<CalendarEvent[]> {
  try {
    const res = await fetch(`${API_URL}/events`);
    if (res.ok) return await res.json();
  } catch {
    // fall through to the static copy
  }
  const res = await fetch(`${import.meta.env.BASE_URL}events.json`);
  if (!res.ok) throw new Error("Could not load events");
  return res.json();
}

async function errorMessage(res: Response) {
  try {
    const body = await res.json();
    if (body?.error) return body.error as string;
  } catch {
    // ignore
  }
  return `Request failed (${res.status})`;
}

const PASSWORD_KEY = "youth-calendar-password";

/** Editors stay signed in on this browser until they sign out. */
export function getStoredPassword(): string {
  try {
    return localStorage.getItem(PASSWORD_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setStoredPassword(password: string | null) {
  try {
    if (password) localStorage.setItem(PASSWORD_KEY, password);
    else localStorage.removeItem(PASSWORD_KEY);
  } catch {
    // storage unavailable; editor just has to sign in again
  }
}

export async function login(password: string): Promise<void> {
  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { Authorization: `Bearer ${password}` },
  });
  if (!res.ok) throw new Error(await errorMessage(res));
}

export async function saveEvents(password: string, events: CalendarEvent[]): Promise<CalendarEvent[]> {
  const res = await fetch(`${API_URL}/events`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${password}`, "Content-Type": "application/json" },
    body: JSON.stringify(events),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json();
}
