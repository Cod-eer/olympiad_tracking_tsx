"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { FormEvent, useEffect, useMemo, useState } from "react";

type OlympiadOption = {
  id: number;
  name: string;
  url?: string | null;
};

type ManagedEvent = {
  id: number;
  olympiadId: number;
  olympiadName: string;
  olympiadUrl?: string | null;
  description: string;
  start: string;
  end: string;
  role: string;
};

type FormState = {
  eventId: number | null;
  olympiadId: string;
  olympiadName: string;
  olympiadUrl: string;
  description: string;
  startDate: string;
  endDate: string;
};

const emptyForm: FormState = {
  eventId: null,
  olympiadId: "",
  olympiadName: "",
  olympiadUrl: "",
  description: "",
  startDate: "",
  endDate: "",
};

function toInputDate(value: string) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
}

export default function ManageEventsPage() {
  const { isSignedIn, isLoaded } = useUser();
  const [events, setEvents] = useState<ManagedEvent[]>([]);
  const [olympiads, setOlympiads] = useState<OlympiadOption[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = form.eventId !== null;
  const isCreatingOlympiad = form.olympiadId === "new";

  async function loadManagerData() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/manage_events", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load event manager.");
      }

      setEvents(data.events);
      setOlympiads(data.olympiads);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load event manager.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      loadManagerData();
    } else if (isLoaded) {
      setIsLoading(false);
    }
  }, [isLoaded, isSignedIn]);

  const adminEvents = useMemo(() => events.filter((event) => event.role === "admin"), [events]);

  function resetForm() {
    setForm(emptyForm);
  }

  function startEditing(event: ManagedEvent) {
    setStatus(null);
    setError(null);
    setForm({
      eventId: event.id,
      olympiadId: String(event.olympiadId),
      olympiadName: "",
      olympiadUrl: "",
      description: event.description,
      startDate: toInputDate(event.start),
      endDate: toInputDate(event.end),
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus(null);
    setError(null);

    const payload = {
      description: form.description,
      startDate: form.startDate,
      endDate: form.endDate,
      olympiadId: form.olympiadId && form.olympiadId !== "new" ? Number(form.olympiadId) : null,
      olympiadName: isCreatingOlympiad ? form.olympiadName : null,
      olympiadUrl: isCreatingOlympiad ? form.olympiadUrl : null,
    };

    try {
      const response = await fetch(
        form.eventId === null ? "/api/manage_events" : `/api/manage_events/${form.eventId}`,
        {
          method: form.eventId === null ? "POST" : "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to save event.");
      }

      setStatus(form.eventId === null ? "Event created successfully." : "Event updated successfully.");
      resetForm();
      await loadManagerData();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to save event.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(eventId: number) {
    const confirmed = window.confirm("Delete this event? This action cannot be undone.");
    if (!confirmed) {
      return;
    }

    setError(null);
    setStatus(null);

    try {
      const response = await fetch(`/api/manage_events/${eventId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to delete event.");
      }

      if (form.eventId === eventId) {
        resetForm();
      }

      setStatus("Event deleted successfully.");
      await loadManagerData();
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Unable to delete event.";
      setError(message);
    }
  }

  if (!isLoaded || isLoading) {
    return <main className="mx-auto max-w-6xl p-6">Loading event manager…</main>;
  }

  if (!isSignedIn) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Sign in to manage your events</h2>
          <p className="mt-3 text-slate-600">
            The event manager is tied to your account so you can add, edit, and remove your own olympiad timeline entries.
          </p>
          <Link className="mt-6 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" href="/">
            Return home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-9xl flex-col gap-6 p-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-center items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Manager</p>
            <h2 className="text-3xl font-semibold text-slate-900">Manage your olympiad events</h2>
            <p className="mt-2 max-w-2xl text-slate-600">
              Create events, connect them to an existing olympiad, or add a new olympiad.
            </p>
          </div>
          {(status || error) && (
            <div className={`flex items-center m-3 inline-flex rounded-lg items-center border border-slate-200 rounded-lg px-10 py-4 text-sm ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
              {error ?? status}
            </div>
          )}
          {isEditing && (
            <div className="flex items-center m-3">
              <button className="inline-flex rounded-lg items-center bg-red-100 text-red-700 px-13 py-4 text-sm font-medium hover:bg-red-400 hover:text-slate-900 hover:px-10.5 hover:py-4.5 duration-300 ease-in-out" type="button" onClick={resetForm}>
                Cancel edit
              </button>
            </div>
          )}
          <div className="flex items-center m-3">
            <Link className="inline-flex rounded-lg items-center border bg-slate-800 px-13 py-4 text-sm font-medium text-white hover:bg-slate-600 hover:text-slate-200 hover:px-10.5 hover:py-4.5 duration-300 ease-in-out" href="/">
              Back to calendar
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] width-full display-flex align-start items-start">
        <form className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex-col align-normal items-start gap-3px" onSubmit={handleSubmit}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">{isEditing ? "Edit event" : "Create event"}</h3>
              <p className="mt-1 text-sm text-slate-500">All events require dates, a description, and an olympiad association.</p>
            </div>

          </div>

          <div className="mt-6 grid gap-5">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Existing olympiad
              <select
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={form.olympiadId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    olympiadId: event.target.value,
                    olympiadName: event.target.value === "new" ? current.olympiadName : "",
                    olympiadUrl: event.target.value === "new" ? current.olympiadUrl : "",
                  }))
                }
              >
                <option value="">Select an olympiad</option>
                {olympiads.map((olympiad) => (
                  <option key={olympiad.id} value={String(olympiad.id)}>
                    {olympiad.name}
                  </option>
                ))}
                <option value="new">Create new olympiad</option>
              </select>
            </label>

            {isCreatingOlympiad && (
              <div className="grid gap-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                  New olympiad name
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2"
                    type="text"
                    value={form.olympiadName}
                    onChange={(event) => setForm((current) => ({ ...current, olympiadName: event.target.value }))}
                    placeholder="International Math Challenge"
                    required={isCreatingOlympiad}
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                  Olympiad website (optional)
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2"
                    type="url"
                    value={form.olympiadUrl}
                    onChange={(event) => setForm((current) => ({ ...current, olympiadUrl: event.target.value }))}
                    placeholder="https://example.org"
                  />
                </label>
              </div>
            )}

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Event description
              <textarea
                className="min-h-28 rounded-lg border border-slate-300 px-3 py-2"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Registration deadline"
                required
              />
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Start date
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2"
                  type="date"
                  value={form.startDate}
                  onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                End date
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2"
                  type="date"
                  value={form.endDate}
                  min={form.startDate || undefined}
                  onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
                  required
                />
              </label>
            </div>
          </div>



          <div className="mt-6 flex flex-wrap gap-3">
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-slate-700 duration-300 ease-in" disabled={isSaving} type="submit">
              {isSaving ? "Saving…" : isEditing ? "Update event" : "Create event"}
            </button>
            <button className="appearance-none rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 hover:text-slate-900 duration-300 ease-in" type="button" onClick={resetForm}>
              Clear form
            </button>
          </div>
        </form>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Your editable events</h3>
            <p className="mt-1 text-sm text-slate-500">Only events where you have admin access can be edited or deleted here.</p>
          </div>

          {adminEvents.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
              You do not have any editable events yet. Create one with the form to get started.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {adminEvents.map((event) => (
                <article key={event.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900">{event.olympiadName}</h4>
                      <p className="mt-1 text-sm text-slate-600">{event.description}</p>
                      <p className="mt-2 text-sm text-slate-500">
                        {toInputDate(event.start)} → {toInputDate(event.end)}
                      </p>
                      {event.olympiadUrl && (
                        <a className="mt-2 inline-flex text-sm font-medium text-blue-600 hover:underline" href={event.olympiadUrl} rel="noreferrer" target="_blank">
                          Visit olympiad site
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700 hover:px-3.5 hover:py-1.5 duration-300 hover:cursor-pointer" type="button" onClick={() => startEditing(event)}>
                        Edit
                      </button>
                      <button className="rounded-md bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500 hover:px-3.5 hover:py-1.5 duration-300" type="button" onClick={() => handleDelete(event.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}