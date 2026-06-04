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
  fees?: string | null;
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

export default function OlympiadHubPage() {
  const { isSignedIn, isLoaded } = useUser();
  const params = useParams<{ name: string }>();
  const [retrievedId, setRetrievedId] = useState<number | null>(null);
  const name = params?.name;
  async function extractId() {
    if (!name) {
      return null;
    }
    const response = await fetch("/backend/generate_name", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ dashedName: name }),
    });
    const data = await response.json();
    return data.id;
  }
  useEffect(() => {
    if (!name) {
      return;
    }
    extractId().then((id) => {
      if (id) {
        setRetrievedId(id);
      } else {
        setError("Invalid olympiad name.");
      }
    });
  }, [name]);

  const [olympiad, setOlympiad] = useState<Olympiad | null>(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [events, setEvents] = useState<OlympiadEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadOlympiadData() {
    if (!retrievedId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/olympiad_hub/${retrievedId}`, { cache: "no-store" });
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
    if (isLoaded && isSignedIn && name) {
      loadOlympiadData();
    } else if (isLoaded) {
      setIsLoading(false);
    }
  }, [isLoaded, isSignedIn, name]);


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
                  <p className="font-semibold text-slate-900">Fees</p>
                  <p className="mt-1 text-slate-600">{olympiad.fees || "Not provided"}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="font-semibold text-slate-900">Eligibility</p>
                  <p className="mt-1 text-slate-600">{olympiad.requirements || "Not provided"}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="font-semibold text-slate-900">Prizes</p>
                  <p className="mt-1 text-slate-600">{olympiad.rewards || "Not provided"}</p>
                </div>
              </div>
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
        </>
      )}
    </main>
  );
}
