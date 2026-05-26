"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import Calendar from "./components/fullcalendar";
import LoadingOverlay from "./components/loading";
import UpcomingEvents from "./components/upcoming-events";

type Event = { title: string; start: string; end?: string };

export default function Landing() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    fetch("/api/show_events").then((r) => r.json()).then(setEvents).catch(() => setEvents([]));
  }, [refreshToken]);

  const stats = useMemo(() => [
    { label: "Tracked Olympiads", value: `${events.length}+` },
    { label: "Deadline Alerts", value: "Real-time" },
    { label: "Parser to Calendar", value: "< 30s" },
  ], [events.length]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const url = String(new FormData(e.currentTarget).get("url") ?? "");
    try {
      const response = await fetch("/api/call_result", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      const { data } = await response.json();
      sessionStorage.setItem("parsedData", JSON.stringify(data));
      router.push("/result");
    } finally { setLoading(false); }
  }

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8 space-y-6">
      <section className="surface relative overflow-hidden p-6 md:p-10">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -bottom-20 left-10 h-52 w-52 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs"><Sparkles className="h-3.5 w-3.5" /> Planner built for serious olympiad candidates</p>
            <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">Own every olympiad deadline with a high-signal command center.</h1>
            <p className="mt-4 max-w-2xl text-sm md:text-base text-muted-foreground">Parse any olympiad site, sync key dates into a structured timeline, and never miss application windows, qualifiers, or result releases.</p>
            <form onSubmit={handleSubmit} className="mt-6 flex flex-col md:flex-row gap-3">
              <input name="url" type="text" placeholder="Paste olympiad URL" className="h-11 flex-1 rounded-xl border bg-background/60 px-4 outline-none focus:ring-2 focus:ring-primary/40" />
              <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-primary-foreground font-medium hover:opacity-90 transition">Run parser demo <ArrowRight className="h-4 w-4" /></button>
            </form>
          </div>
          <div className="grid gap-3 self-end">
            {stats.map((s) => <div key={s.label} className="rounded-xl border border-white/10 bg-background/45 p-4"><div className="text-2xl font-semibold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div>)}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="surface p-3 md:p-5">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Live Calendar</h2><span className="text-xs text-muted-foreground">click date to add • drag to move</span></div>
          <Calendar events={events} onEventsChanged={() => setRefreshToken((p) => p + 1)} />
        </div>
        <UpcomingEvents limit={6} refreshToken={refreshToken} />
      </section>
      {loading && <LoadingOverlay />}
    </main>
  );
}
