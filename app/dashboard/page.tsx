"use client";

import { CalendarDays, Compass, PanelLeft, Trophy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Calendar from "../components/fullcalendar";
import LoadingOverlay from "../components/loading";
import UpcomingEvents from "../components/upcoming-events";

type Event = { id?: number; title: string; start: string; end?: string };

export default function Dashboard() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);
  const [progress, setProgress] = useState<{ experience: number; level: number; missedEvents: number } | null>(null);

  useEffect(() => { fetch("/api/show_events").then((res) => res.json()).then(setEvents).catch(() => setEvents([])); }, [refreshToken]);
  useEffect(() => { if (isLoaded && isSignedIn) fetch("/api/user_progress", { cache: "no-store" }).then((r) => r.json()).then(setProgress).catch(() => setProgress(null)); }, [isLoaded, isSignedIn, refreshToken]);

  const missedMessage = useMemo(() => !progress ? "No progress data." : progress.missedEvents === 0 ? "No missed deadlines." : `${progress.missedEvents} missed deadline${progress.missedEvents > 1 ? "s" : ""}.`, [progress]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true);
    const url = String(new FormData(e.currentTarget).get("url") ?? "");
    try { const response = await fetch("/api/call_result", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) }); const { data } = await response.json(); sessionStorage.setItem("parsedData", JSON.stringify(data)); router.push("/result"); } finally { setLoading(false); }
  }

  if (!isSignedIn) return <main className="mx-auto max-w-3xl p-6"><div className="surface p-8"><h2 className="text-2xl font-semibold">Sign in to view your dashboard</h2><p className="mt-2 text-muted-foreground">Your events and reminders are account-specific.</p><Link href="/" className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2 text-primary-foreground">Return home</Link></div></main>;

  return <main className="mx-auto max-w-7xl p-4 md:p-8"><div className="grid gap-6 lg:grid-cols-[220px_1fr]"><aside className="surface h-fit p-3"><nav className="space-y-1 text-sm"><Link href="/dashboard" className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2"><PanelLeft className="h-4 w-4" /> Dashboard</Link><Link href="/my_olympiads" className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-secondary"><Trophy className="h-4 w-4" /> My Olympiads</Link><Link href="/manage" className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-secondary"><Compass className="h-4 w-4" /> Manage Events</Link></nav></aside>
  <section className="space-y-6"><div className="surface p-4 md:p-5"><div className="grid gap-4 md:grid-cols-[1fr_2fr_1fr]"><div><p className="text-xs text-muted-foreground">Experience</p><p className="text-2xl font-semibold">{progress?.experience ?? 0} XP</p><p className="text-sm text-muted-foreground">Level {progress?.level ?? 1}</p></div><form onSubmit={handleSubmit} className="flex gap-2"><input name="url" placeholder="Parse olympiad URL" className="h-10 w-full rounded-lg border bg-background/50 px-3" /><button className="h-10 rounded-lg bg-primary px-4 text-primary-foreground">Parse</button></form><div className="text-sm"><p className="text-xs text-muted-foreground">Status</p><p>{missedMessage}</p></div></div></div>
  <div className="grid gap-6 xl:grid-cols-[1.75fr_1fr]"><div className="surface p-3 md:p-5"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Calendar</h2><span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5"/> drag, drop, edit</span></div><Calendar events={events} onEventsChanged={() => setRefreshToken((p) => p + 1)} /></div><UpcomingEvents limit={6} refreshToken={refreshToken} /></div></section></div>{loading && <LoadingOverlay />}</main>;
}
