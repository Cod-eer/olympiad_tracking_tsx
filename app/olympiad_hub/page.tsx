"use client";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

export default function OlympiadHub() {
  const [olympiads, setOlympiads] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const filteredOlympiads = useMemo(() => {
    if (!searchQuery) return olympiads;
    const lowerQuery = searchQuery.toLowerCase();
    return olympiads.filter((olympiad) => {
      if (!olympiad) return false;
      const nameMatch =
        olympiad.name?.toLowerCase().includes(lowerQuery);
      const organizerMatch =
        Array.isArray(olympiad.organizers) &&
        olympiad.organizers.some((org: string) =>
          org.toLowerCase().includes(lowerQuery)
        );
      return nameMatch || organizerMatch;
    });
  }, [olympiads, searchQuery]);
  useEffect(() => {
      fetch("/api/olympiad_hub", { cache: "no-store" })
          .then((res) => res.json())
          .then((data) => setOlympiads(data))
          .catch((err) => console.error(err));
  }, []);
  return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link href="/dashboard" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            ← Back to my calendar
          </Link>
        </div>
        <div className="mb-10 text-center">
          <h1 className="text-5xl font-bold tracking-tight">
            Olympiad Hub
          </h1>
          <p className="mt-3 text-slate-500">
            Discover international olympiads, competitions and challenges.
          </p>
        </div>
        <div className="mx-auto mb-8 max-w-2xl">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search olympiads..."
            className=" w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-lg shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100"
          />
        </div>
        <div className="mb-8 flex items-center justify-between">
          <p className="text-slate-500">
            {filteredOlympiads.length} olympiads available
          </p>
        </div>
        {filteredOlympiads.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
            <h3 className="text-sizel font-semibold text-slate-500 text-center text-sm">No olympiads found.</h3>
          </div>
        ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredOlympiads.map((olympiad) => (
                    <div
                      key={olympiad.id}
                      className=" group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div className="h-full flex flex-col justify-between items-center gap-4 mb-4">
                        <div className="flex justify-between gap-5 mb-5 w-full justify-between items-start">
                            <div className="flex flex-col items-center gap-2 ml-5">
                              <h3 className="text-xl font-bold">{olympiad.name}</h3>
                            </div>
                            <button
                              onClick={() =>
                                router.push(`/olympiad_hub/${olympiad.dashed_name}`)
                              }
                              className="rounded-xl bg-slate-900 py-6 px-3 font-semibold text-white transition hover:bg-slate-700"
                            >
                              View Olympiad
                            </button>
                        </div>
                        <p className="mt-4 text-sm text-slate-500 line-clamp-2">
                          {olympiad.organizers?.slice(0, 2).join(" • ")}
                        </p>
                      </div>
                    </div>
                ))}
            </div>
        )}
      </div>

  );
}

