/**
 * Youth Calendar API.
 *
 * GET  /events  -> current events.json from the GitHub repo
 * POST /login   -> 204 if the password is correct, 401 otherwise
 * PUT  /events  -> replace events.json (password required); commits to the repo
 *
 * Secrets (set with `wrangler secret put`): EDIT_PASSWORD, GITHUB_TOKEN
 */

export interface Env {
  EDIT_PASSWORD: string;
  GITHUB_TOKEN: string;
  GITHUB_REPO: string; // "owner/name"
  GITHUB_BRANCH: string;
  EVENTS_PATH: string;
  ALLOWED_ORIGINS: string; // comma-separated
}

const GROUPS = ["deacons", "teachers", "priests", "combinedYoungMen", "combinedAllYouth"];

type CalendarEvent = { title: string; start: string; groups: string[] };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin") ?? "";
    const allowed = env.ALLOWED_ORIGINS.split(",").map((s) => s.trim());
    const cors: Record<string, string> = allowed.includes(origin)
      ? {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
          Vary: "Origin",
        }
      : { Vary: "Origin" };

    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
      });

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    const { pathname } = new URL(request.url);

    try {
      if (pathname === "/events" && request.method === "GET") {
        const { events } = await readEvents(env);
        return json(events);
      }

      if (pathname === "/login" && request.method === "POST") {
        if (!(await checkPassword(request, env))) return json({ error: "Wrong password" }, 401);
        return new Response(null, { status: 204, headers: cors });
      }

      if (pathname === "/events" && request.method === "PUT") {
        if (!(await checkPassword(request, env))) return json({ error: "Wrong password" }, 401);

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Body must be JSON" }, 400);
        }
        const validated = validateEvents(body);
        if (typeof validated === "string") return json({ error: validated }, 400);

        const { sha } = await readEvents(env);
        await writeEvents(env, validated, sha);
        return json(validated);
      }

      return json({ error: "Not found" }, 404);
    } catch (err) {
      console.error(err);
      return json({ error: err instanceof Error ? err.message : "Server error" }, 500);
    }
  },
};

async function checkPassword(request: Request, env: Env): Promise<boolean> {
  const header = request.headers.get("Authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  // Compare digests so the comparison is constant-time regardless of length.
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(given)),
    crypto.subtle.digest("SHA-256", enc.encode(env.EDIT_PASSWORD)),
  ]);
  return crypto.subtle.timingSafeEqual(a, b);
}

function validateEvents(body: unknown): CalendarEvent[] | string {
  if (!Array.isArray(body)) return "Expected an array of events";
  if (body.length > 2000) return "Too many events";
  const out: CalendarEvent[] = [];
  for (const [i, raw] of body.entries()) {
    if (typeof raw !== "object" || raw === null) return `Event ${i + 1} is not an object`;
    const { title, start, groups } = raw as Record<string, unknown>;
    if (typeof title !== "string" || !title.trim() || title.length > 200)
      return `Event ${i + 1} needs a title (max 200 characters)`;
    if (typeof start !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(start) || isNaN(Date.parse(start)))
      return `Event ${i + 1} needs a date like 2026-09-15`;
    if (!Array.isArray(groups) || groups.some((g) => typeof g !== "string" || !GROUPS.includes(g)))
      return `Event ${i + 1} has an unknown group`;
    // Dedupe and keep a stable group order.
    const cleanGroups = GROUPS.filter((g) => groups.includes(g));
    if (cleanGroups.length === 0) return `Event ${i + 1} ("${title.trim()}") needs at least one group`;
    out.push({ title: title.trim(), start, groups: cleanGroups });
  }
  out.sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
  return out;
}

function githubHeaders(env: Env): HeadersInit {
  return {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "youth-calendar-worker",
  };
}

function contentsUrl(env: Env) {
  return `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${env.EVENTS_PATH}`;
}

async function readEvents(env: Env): Promise<{ events: CalendarEvent[]; sha: string }> {
  const res = await fetch(`${contentsUrl(env)}?ref=${encodeURIComponent(env.GITHUB_BRANCH)}`, {
    headers: githubHeaders(env),
  });
  if (!res.ok) throw new Error(`GitHub read failed (${res.status})`);
  const data = (await res.json()) as { content: string; sha: string };
  const bytes = Uint8Array.from(atob(data.content.replace(/\n/g, "")), (c) => c.charCodeAt(0));
  return { events: JSON.parse(new TextDecoder().decode(bytes)), sha: data.sha };
}

async function writeEvents(env: Env, events: CalendarEvent[], sha: string) {
  const text = JSON.stringify(events, null, 2) + "\n";
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);

  const res = await fetch(contentsUrl(env), {
    method: "PUT",
    headers: { ...githubHeaders(env), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Update calendar events (via editor)",
      content: btoa(binary),
      sha,
      branch: env.GITHUB_BRANCH,
    }),
  });
  if (res.status === 409) throw new Error("Someone else saved at the same time. Reload and try again.");
  if (!res.ok) throw new Error(`GitHub write failed (${res.status})`);
}
