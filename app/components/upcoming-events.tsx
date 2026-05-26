"use client";

import { BellRing, Loader2, Mail } from "lucide-react";
import { useEffect, useState } from "react";

interface Event { id: number; olympiad_id: number; name: string; action: string; start: string; end: string; completed?: boolean; urgencyLevel?: string; urgencyLabel?: string; deadlineStatus?: string; }

const levelTone: Record<string, string> = { overdue: "bg-red-500", critical: "bg-red-500", soon: "bg-amber-500", normal: "bg-indigo-500", unknown: "bg-slate-500", completed: "bg-emerald-500" };
const rel = (date?: string) => date ? new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(Math.ceil((new Date(date).getTime() - Date.now()) / 86400000), "day") : "unscheduled";

export default function UpcomingEvents({ limit, refreshToken = 0 }: { limit: number; refreshToken?: number }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => { fetch(`/api/upcoming?limit=${limit}`).then(async (r) => r.ok ? r.json() : []).then((d) => setEvents(Array.isArray(d) ? d : [])).catch(() => setEvents([])); }, [limit, refreshToken]);

  async function sendBriefing() {
    setIsSending(true); setStatus(null);
    try { const response = await fetch("/api/deadline_briefing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lookaheadDays: 7 }) }); const data = await response.json(); setStatus(data.sent ? `Briefing sent to ${data.to}.` : data.message || "No upcoming deadlines this week."); } catch { setStatus("Unable to send briefing."); } finally { setIsSending(false); }
  }

  return <aside className="surface p-4 md:p-5"><div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 text-base font-semibold"><BellRing className="h-4 w-4"/>Upcoming</h2><button onClick={sendBriefing} disabled={isSending} className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1.5 text-xs hover:brightness-95">{isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Mail className="h-3.5 w-3.5"/>} Email</button></div>
  {status && <p className="mb-3 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">{status}</p>}
  {events.length === 0 ? <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No upcoming events yet.</div> : <ul className="space-y-3">{events.map((event) => { const level = event.completed ? "completed" : event.urgencyLevel ?? "unknown"; return <li key={`${event.id}-${event.olympiad_id}`} className="group relative rounded-xl border bg-background/35 p-3 transition hover:bg-background/65"><div className={`absolute inset-y-3 left-0 w-1 rounded-full ${levelTone[level] ?? levelTone.unknown}`} /><div className="pl-3"><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-medium leading-snug">{event.name}</p><p className="text-xs text-muted-foreground">{event.action}</p></div><span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wide">{event.urgencyLabel ?? "Unknown"}</span></div><div className="mt-2 flex items-center justify-between text-xs text-muted-foreground"><span>{event.deadlineStatus ?? "No deadline"}</span><span>{rel(event.end)}</span></div></div></li>; })}</ul>}</aside>;
}
