"use client";

import Link from "next/link";
import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";

type OlympiadOption = {
  id: number;
  name: string;
  url?: string | null;
  completed?: boolean;
};

export default function MyOlympiadsPage() {
  const { isSignedIn, isLoaded } = useUser();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [olympiads, setOlympiads] = useState<OlympiadOption[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editOlympiadId, setEditOlympiadId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");

  async function loadOlympiadData() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/my_olympiads", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load olympiads.");
      }

      setOlympiads(data.olympiads || []);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load olympiads.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      loadOlympiadData();
    } else if (isLoaded) {
      setIsLoading(false);
    }
  }, [isLoaded, isSignedIn]);

  const completedSet = useMemo(() => new Set(olympiads.filter((o) => o.completed).map((o) => o.id)), [olympiads]);

  async function toggleCompletedOlympiad(id: number) {
    const nextCompleted = !completedSet.has(id);
    const response = await fetch(`/api/my_olympiads/${id}`, { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ completed: nextCompleted }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to update completion status.");
    setStatus(nextCompleted ? "Olympiad marked as completed." : "Olympiad marked as active.");
    await loadOlympiadData();
  }

  function openEdit(olympiad: OlympiadOption) {
    setError(null);
    setStatus(null);
    setEditOlympiadId(olympiad.id);
    setEditName(olympiad.name || "");
    setEditUrl(olympiad.url || "");
    setIsEditOpen(true);
  }

  async function deleteOlympiad(id: number) {
    const confirmed = window.confirm("Delete this olympiad? This action cannot be undone.");
    if (!confirmed) {
      return;
    }

    setError(null);
    setStatus(null);

    try {
      const response = await fetch(`/api/my_olympiads/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete olympiad.");
      }
      setStatus("Olympiad deleted successfully.");
      await loadOlympiadData();
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Failed to delete olympiad.";
      setError(message);
    }
  }

  async function handleOlympiadUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editOlympiadId) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch(`/api/my_olympiads/${editOlympiadId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editName,
          url: editUrl,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to update olympiad.");
      }
      setStatus("Olympiad updated successfully.");
      setIsEditOpen(false);
      await loadOlympiadData();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to update olympiad.";
      setError(message);
    } finally {
      setIsSaving(false);
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
            You need to{" "}
            <Link href="/sign-in" className="font-medium text-slate-900">
              sign in
            </Link>{" "}
            to view your olympiads.
          </p>
          <Link className="mt-6 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" href="/">
            Return home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link href="/dashboard" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          ← Back to my calendar
        </Link>
      </div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Olympiads</h1>

        <Link href="/manage" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 hover:px-4.5 hover:py-2.5 hover:text-white duration-300">
          Add Olympiad
        </Link>
      </div>

      {error && <div className="mb-4 text-red-600">{error}</div>}
      {status && <div className="mb-4 text-emerald-700">{status}</div>}

      {olympiads.length === 0 ? (
        <div className="text-slate-600">You don’t have any olympiads yet.</div>
      ) : (
        <div className="grid gap-4">
          {olympiads.map((olympiad) => (
            <div
              key={olympiad.id}
              className="flex items-center justify-between rounded-xl border bg-white p-5 shadow-sm"
            >
              <div>
                <h2 className="text-lg font-semibold">{olympiad.name}</h2>
                {completedSet.has(olympiad.id) && <p className="text-sm text-emerald-700">Completed</p>}

                {olympiad.url && (
                  <a href={olympiad.url} target="_blank" rel="noreferrer" className="text-sm text-blue-600">
                    Visit website
                  </a>
                )}
              </div>

              <div className="flex gap-2">
                <Link href={`/my_olympiads/${olympiad.id}`} className="rounded-md border px-3 py-1 hover:px-3.5 hover:py-1.5 hover:bg-slate-100 duration-300 text-sm">
                  View
                </Link>

                <button onClick={() => toggleCompletedOlympiad(olympiad.id).catch((e)=>setError(e.message))} className="rounded-md bg-emerald-700 px-3 py-1 text-sm text-white hover:bg-emerald-600 hover:px-3.5 hover:py-1.5 duration-300 hover:cursor-pointer">
                  {completedSet.has(olympiad.id) ? "Mark active" : "Mark completed"}
                </button>

                <button onClick={() => openEdit(olympiad)} className="rounded-md bg-slate-900 px-3 py-1 text-sm text-white hover:bg-slate-700 hover:px-3.5 hover:py-1.5 duration-300 hover:cursor-pointer">
                  Edit
                </button>

                <button onClick={() => deleteOlympiad(olympiad.id)} className="rounded-md bg-red-700 px-3 py-1 text-sm font-semibold text-white hover:bg-red-500 hover:px-3.5 hover:py-1.5 duration-300 hover:cursor-pointer">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleOlympiadUpdate} className="flex flex-col w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-slate-900">Edit olympiad</h2>
            <div className="mt-5 grid w-full gap-4">
              <label className="grid gap-2 w-full text-sm font-medium text-slate-700">
                Olympiad name
                <input
                  required
                  className="rounded-lg border border-slate-300 px-3 py-2"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Olympiad website (optional)
                <input
                  type="url"
                  className="rounded-lg border border-slate-300 px-3 py-2"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:px-4.5 hover:py-2.5 hover:text-slate-900 duration-300 hover:cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-slate-700 hover:px-4.5 hover:py-2.5 hover:text-white duration-300 hover:cursor-pointer"
              >
                {isSaving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}