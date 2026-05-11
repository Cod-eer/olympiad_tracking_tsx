"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
type Olympiad = { id: number; name: string; completed?: boolean };

export default function ProfilePage() {
  const { isLoaded, isSignedIn } = useUser();
  const [olympiads, setOlympiads] = useState<Olympiad[]>([]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetch("/api/my_olympiads", { cache: "no-store" }).then((res) => res.json()).then((data) => setOlympiads(data.olympiads ?? [])).catch(() => setOlympiads([]));
  }, [isLoaded, isSignedIn]);

  const stats = useMemo(() => {
    const total = olympiads.length;
    const completed = olympiads.filter((o) => o.completed).length;
    const active = total - completed;
    const completionRate = total ? Math.round((completed / total) * 100) : 0;
    return { total, completed, active, completionRate };
  }, [olympiads]);

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-3xl font-bold">Profile statistics</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-slate-500">Total olympiads</p>
          <p className="text-2xl font-semibold">{stats.total}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-slate-500">Completed</p>
          <p className="text-2xl font-semibold text-emerald-700">{stats.completed}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-slate-500">Active</p>
          <p className="text-2xl font-semibold">{stats.active}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-slate-500">Completion rate</p>
          <p className="text-2xl font-semibold">{stats.completionRate}%</p>
        </div>
      </div>
    </main>
  );
}

