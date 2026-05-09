"use client";

import Link from "next/link";
import { redirect, useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";


type Olympiad = {
  id: number;
  name: string;
  url?: string | null;
  organizers?: string | null;
  rewards?: string | null;
  requirements?: string | null;
};

type OlympiadEvent = {
  id: number;
  action: string;
  start: string;
  end: string;
  role: string;
};

function toInputDate(value: string) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
}

export default function OlympiadDetailsPage() {
  const { isSignedIn, isLoaded } = useUser();
  const params = useParams<{ OlympiadId: string }>();
  const olympiadId = params?.OlympiadId;

  const [olympiad, setOlympiad] = useState<Olympiad | null>(null);
  const [events, setEvents] = useState<OlympiadEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");

  const hasAdminAccess = useMemo(() => events.some((event) => event.role === "admin"), [events]);

  async function loadOlympiadData() {
    if (!olympiadId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/my_olympiads/${olympiadId}`, { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load olympiad.");
      }

      setOlympiad(data.olympiad);
      setEvents(data.events || []);
      setEditName(data.olympiad?.name || "");
      setEditUrl(data.olympiad?.url || "");
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load olympiad.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (isLoaded && isSignedIn && olympiadId) {
      loadOlympiadData();
    } else if (isLoaded) {
      setIsLoading(false);
    }
  }, [isLoaded, isSignedIn, olympiadId]);

  async function handleOlympiadUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch(`/api/my_olympiads/${olympiadId}`, {
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

  async function handleOlympiadDelete() {
    if (!olympiadId) {
      return;
    }

    try {
      const response = await fetch(`/api/my_olympiads/${olympiadId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to delete olympiad.");
      }

      setStatus("Olympiad deleted successfully.");
      const router = useRouter();
      router.push("/my_olympiads");
      router.refresh();
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Unable to delete olympiad.";
      setError(message);
    }
  }

  if (!isLoaded || isLoading) {
    return <main className="mx-auto max-w-6xl p-6">Loading olympiad…</main>;
  }

  if (!isSignedIn) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Sign in to view your olympiad</h2>
          <p className="mt-3 text-slate-600">You need to sign in to view this page.</p>
          <Link className="mt-6 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" href="/my_olympiads">
            Back to my olympiads
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link href="/my_olympiads" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          ← Back to my olympiads
        </Link>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>}
      {status && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">{status}</div>}

      {!olympiad ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5">Olympiad not found.</div>
      ) : (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Olympiad</p>
                <h1 className="text-xl font-semibold uppercase tracking-[0.2em] text-slate-500">{olympiad.name}</h1>
                {olympiad.url && (
                  <a href={olympiad.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm font-medium text-blue-600 hover:underline">
                    Visit olympiad website
                  </a>
                )}
              </div>
              <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="font-semibold text-slate-900">Organizers</p>
                  <p className="mt-1 text-slate-600">{olympiad.organizers || "Not provided"}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="font-semibold text-slate-900">Prizes</p>
                  <p className="mt-1 text-slate-600">{olympiad.rewards || "Not provided"}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="font-semibold text-slate-900">Eligibility</p>
                  <p className="mt-1 text-slate-600">{olympiad.requirements || "Not provided"}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOpen(true)}
                className="rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 hover:px-4.5 hover:py-3.5 duration-300 hover:cursor-pointer"
              >
                Edit olympiad
              </button>
              <button
                type="button"
                onClick={handleOlympiadDelete}
                className="rounded-lg bg-red-700 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500 hover:px-4.5 hover:py-3.5 duration-300 hover:cursor-pointer"
              >
                Delete olympiad
              </button>
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Events</h2>
            {events.length === 0 ? (
              <p className="mt-3 text-slate-600">No events available for this olympiad yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {events.map((event) => (
                  //console.log(event),
                  <article key={event.id} className="rounded-xl border border-slate-200 p-4">
                    <h3 className="font-semibold text-slate-900">{event.action}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {toInputDate(event.start)} → {toInputDate(event.end)}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>

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
        </>
      )}
    </main>
  );
}
