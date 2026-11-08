import { useEffect, useState } from "react";
import {
  GROUPS,
  fetchEvents,
  getStoredPassword,
  login,
  saveEvents,
  setStoredPassword,
  type CalendarEvent,
  type GroupId,
} from "./events";

type Row = CalendarEvent & { key: number };

const YM_QUORUMS: GroupId[] = ["deacons", "teachers", "priests"];

let nextKey = 1;
// Latest first. Sorted only on load/save so rows don't jump while editing.
const toRows = (events: CalendarEvent[]): Row[] =>
  [...events]
    .sort((a, b) => b.start.localeCompare(a.start) || a.title.localeCompare(b.title))
    .map((e) => ({ ...e, key: nextKey++ }));

export default function Editor() {
  const [password, setPassword] = useState(getStoredPassword);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (!password || authed) return;
    login(password).then(
      () => setAuthed(true),
      () => {
        setStoredPassword(null);
        setPassword("");
      },
    );
    // Only on first load, to re-use a password from earlier in this tab.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!authed) {
    return (
      <LoginForm
        onSuccess={(pw) => {
          setStoredPassword(pw);
          setPassword(pw);
          setAuthed(true);
        }}
      />
    );
  }
  return <EventsForm password={password} />;
}

function LoginForm({ onSuccess }: { onSuccess: (password: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="mx-auto mt-8 flex max-w-sm flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          await login(value);
          onSuccess(value);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Login failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="flex flex-col gap-1 text-sm font-medium">
        Editor password
        <input
          type="password"
          autoFocus
          className="rounded-md border border-slate-300 px-3 py-2 text-base"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={busy || !value}
        className="rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
      >
        {busy ? "Checking…" : "Sign in"}
      </button>
      <a href={import.meta.env.BASE_URL} className="text-center text-sm text-slate-600 underline">
        Back to calendar
      </a>
    </form>
  );
}

function EventsForm({ password }: { password: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPast, setShowPast] = useState(true);

  useEffect(() => {
    fetchEvents().then(
      (events) => setRows(toRows(events)),
      (err) => setStatus({ kind: "error", text: String(err) }),
    );
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (!rows) return <p className="mt-8 text-center text-slate-600">{status?.text ?? "Loading…"}</p>;

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Denver" });
  const visible = rows.filter((r) => showPast || !r.start || r.start >= today);
  const hiddenCount = rows.length - visible.length;

  const update = (key: number, patch: Partial<CalendarEvent>) => {
    setRows((prev) => prev!.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    setDirty(true);
    setStatus(null);
  };

  const toggleGroup = (row: Row, group: GroupId) => {
    if (row.groups.includes(group)) {
      update(row.key, { groups: row.groups.filter((g) => g !== group) });
      return;
    }
    // Combined YM already means deacons, teachers and priests, so the two
    // choices replace each other rather than stacking.
    let groups = [...row.groups, group];
    if (group === "combinedYoungMen") groups = groups.filter((g) => !YM_QUORUMS.includes(g));
    else if (YM_QUORUMS.includes(group)) groups = groups.filter((g) => g !== "combinedYoungMen");
    update(row.key, { groups });
  };

  const addRow = () => {
    setRows((prev) => [{ key: nextKey++, title: "", start: "", groups: [] }, ...prev!]);
    setDirty(true);
    setStatus(null);
  };

  const removeRow = (key: number) => {
    setRows((prev) => prev!.filter((r) => r.key !== key));
    setDirty(true);
    setStatus(null);
  };

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const saved = await saveEvents(
        password,
        rows.map(({ title, start, groups }) => ({ title, start, groups })),
      );
      setRows(toRows(saved));
      setDirty(false);
      setStatus({ kind: "ok", text: "Saved. The calendar shows the changes right away." });
    } catch (err) {
      setStatus({ kind: "error", text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <a href={import.meta.env.BASE_URL} className="text-sm text-slate-600 underline">
          ← Back to calendar
        </a>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="text-sm text-slate-600 underline"
            onClick={() => {
              if (dirty && !window.confirm("Discard unsaved changes and sign out?")) return;
              setStoredPassword(null);
              window.location.href = import.meta.env.BASE_URL;
            }}
          >
            Sign out
          </button>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} />
            Show past events{hiddenCount ? ` (${hiddenCount})` : ""}
          </label>
          <button
            type="button"
            onClick={addRow}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium"
          >
            + Add event
          </button>
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {visible.map((row) => (
          <li key={row.key} className="rounded-lg border border-slate-200 p-3 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="date"
                aria-label="Date"
                className="rounded-md border border-slate-300 px-2 py-1.5"
                value={row.start}
                onChange={(e) => update(row.key, { start: e.target.value })}
              />
              <input
                type="text"
                aria-label="Title"
                placeholder="Event title"
                className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1.5"
                value={row.title}
                onChange={(e) => update(row.key, { title: e.target.value })}
              />
              <button
                type="button"
                onClick={() => removeRow(row.key)}
                className="self-end rounded-md px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 sm:self-auto"
              >
                Delete
              </button>
            </div>
            <fieldset className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              <legend className="sr-only">Groups</legend>
              {GROUPS.map((g) => (
                <label key={g.id} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    style={{ accentColor: g.color }}
                    checked={row.groups.includes(g.id)}
                    onChange={() => toggleGroup(row, g.id)}
                  />
                  {g.label}
                </label>
              ))}
            </fieldset>
          </li>
        ))}
      </ul>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <p
            role="status"
            className={`text-sm ${status?.kind === "error" ? "text-red-600" : "text-slate-600"}`}
          >
            {status?.text ?? (dirty ? "You have unsaved changes." : "No changes.")}
          </p>
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty}
            className="rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
