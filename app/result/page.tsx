"use client"; // Needed for client-side hooks in Next.js App Router

import { SlidersHorizontal } from "lucide-react";
import React, { useEffect, useState } from "react";

type ParsedData = {
  name: string;
  url: string;
  difficulty: number;
  dates: any[];
  billing: any[];
  requirements: any[];
  rewards: any[];
  organizers: any[];
};

export default function ResultsPage() {
  const [data, setData] = useState<ParsedData | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [difficulty, setDifficulty] = useState(5.0);

  useEffect(() => {
    const stored = sessionStorage.getItem("parsedData");
    if (stored) {
      const parsed = JSON.parse(stored) as ParsedData;
      setData(parsed);
    }
  }, []);
  console.log(data);
  function buildList(items: any[]) {
    if (!items || items.length === 0) return <p>Not specified</p>;

    return (
      <ul className="list-disc list-inside space-y-2 text-gray-700">
        {items.map((item, i) =>
          typeof item === "string" ? (
            <li className="text-gray-700 font-semibold" key={i}>{item}</li>
          ) : (
            <li key={i}>
              {item.main}
              {item.subitems && (
                <ul>
                  {item.subitems.map((sub: string, j: number) => (
                    <li key={j}>{sub}</li>
                  ))}
                </ul>
              )}
            </li>
          )
        )}
      </ul>
    );
  }

  function InfoCard({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </h2>

        <div className="text-slate-700">
          {children}
        </div>
      </div>
    );
  }

  async function handleAddToHub() {
    if (!data) return;
    data.difficulty = difficulty;
    try {
      const response = await fetch("/api/add_to_hub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dict: data }),
      });

      const result = await response.json();
      if (result.success) {
        alert("Event added to Olympiad Hub successfully!");
        window.location.href = "/olympiad_hub";
      } else if (result.exists){
        alert("Event already exists in Olympiad Hub!");
        window.location.href = "/olympiad_hub";
      } else {
        alert("Failed to add event to Olympiad Hub");
        console.error(result.error);
      }
    } catch (error) {
      const err = error as { code: string };
      if (err.code === '23505') {
        alert('Event already exists in Olympiad Hub');
      }
      throw error;
    }
  }

  async function handleAddEvent() {
    if (!data) return;

    try {
      const response = await fetch("/api/add_event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dict: data }),
      });

      const result = await response.json();
      if (result.success) {
        alert("Event added successfully!");
        window.location.href = "/";
      } else if (result.exists){
        alert("Event already exists!");
        window.location.href = "/";
      } else {
        alert("Failed to add event");
        console.error(result.error);
      }
    } catch (error) {
      const err = error as { code: string };
      if (err.code === '23505') {
        alert('Event already exists');
        window.location.href = "/";
      }
      throw error;
    }
  }

  if (!data) {
    return <p>Error loading data. Please try again.</p>;
  }

  const displayDates = Array.isArray(data.dates) ? data.dates.map(d => `${d.dateStart} to ${d.dateEnd} – ${d.description}`) : [];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {data.name}
            </h1>

            <a
              href={data.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
            >
              Visit website ↗
            </a>
          </div>
          <button
            type="button"
            onClick={setIsSharing.bind(null, true)}
            className="rounded-xl bg-slate-900 px-5 py-2.5 font-medium text-white hover:bg-slate-700 hover:px-5.5 hover:py-3 duration-300"
          >
            Share on OlympHub
          </button>
          <button
            type="button"
            onClick={handleAddEvent}
            className="rounded-xl bg-slate-900 px-5 py-2.5 font-medium text-white hover:bg-slate-700 hover:px-5.5 hover:py-3 duration-300"
          >
            Track Olympiad
          </button>

        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard title="Dates">
          {buildList(displayDates)}
        </InfoCard>

        <InfoCard title="Billing">
          {buildList(data.billing)}
        </InfoCard>

        <InfoCard title="Requirements">
          {buildList(data.requirements)}
        </InfoCard>

        <InfoCard title="Rewards">
          {buildList(data.rewards)}
        </InfoCard>
      </div>

      <InfoCard title="Organizers">
        {buildList(data.organizers)}
      </InfoCard>

      {isSharing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl">

              <div className="border-b border-slate-100 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100">
                    🌍
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      Share on trackolymp.tech
                    </h2>
                    <p className="text-sm text-slate-500">
                      Help other students discover this olympiad.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6 p-6">

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <label className="font-medium text-slate-800">
                      Difficulty Rating
                    </label>

                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700">
                      {difficulty}/10
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setDifficulty(value)}
                        className={`
                          h-10 w-10 rounded-xl font-semibold transition-all
                          ${
                            difficulty === value
                              ? "scale-110 bg-indigo-600 text-white shadow-lg"
                              : "border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50"
                          }
                        `}
                      >
                        {value}
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 flex justify-between text-xs text-slate-500">
                    <span>Beginner</span>
                    <span>Olympiad Elite</span>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-700">
                    Publishing will make this olympiad visible to the community.
                  </p>
                  <p className="text-sm text-slate-700">
                    Other students will be able to discover, track, and rate it.
                  </p>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsSharing(false)}
                    className="rounded-xl border border-slate-200 px-5 py-3 font-medium text-slate-600 hover:border-slate-300 hover:px-5.5 hover:py-3.5 duration-300"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleAddToHub}
                    className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-md hover:bg-indigo-500 hover:shadow-lg hover:px-6.5 hover:py-3.5 duration-300"
                  >
                    Publish Olympiad
                  </button>
                </div>
              </div>
            </div>
          </div>
      )}

    </div>
  );
}
