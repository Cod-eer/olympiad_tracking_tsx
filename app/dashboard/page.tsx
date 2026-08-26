"use client";

import "../globals.css";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import Calendar from "../components/fullcalendar";
import LoadingOverlay  from "../components/loading";
import UpcomingEvents from "../components/upcoming-events";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";


interface Event {
  id?: number;
  olympiadId?: number;
  title: string;
  olympiadTitle: string;
  start: string;
  end?: string;
}

export default function Dashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        console.log("clicked!");
        e.preventDefault();
        setLoading(true);
        const newForm = new FormData(e.currentTarget);
        const urlValue = newForm.get("url") as string;
        try {
            const response = await fetch("/api/call_result", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ url: urlValue }),
            });
            const { data } = await response.json();
            if (data.error) {
                console.error("Error:", data.error);
            }

            sessionStorage.setItem("parsedData", JSON.stringify(data));
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading(false);
            router.push(`/result`);
        }
    }

    const [events, setEvents] = useState<Event[]>([]);
    const [refreshToken, setRefreshToken] = useState(0);
    const [progress, setProgress] = useState<{
        experience: number;
        level: number;
        missedEvents: number;
    } | null>(null);
    useEffect(() => {
        fetch("/api/show_events")
            .then((res) => res.json())
            .then((data) => setEvents(data))
            .catch((err) => console.error(err));
    }, [refreshToken]);

    const { isSignedIn, isLoaded } = useUser();

    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;
        fetch("/api/user_progress", { cache: "no-store" })
            .then((res) => res.json())
            .then((data) => setProgress(data))
            .catch(() => setProgress(null));
    }, [isLoaded, isSignedIn, refreshToken]);

    const missedMessage = useMemo(() => {
        if (!progress) return "Progress data not available.";
        if (progress.missedEvents === 0) return "No missed deadlines. Congratulations!";
        if (progress.missedEvents === 1) return "You have 1 missed deadline.";
        return `You have ${progress.missedEvents} missed deadlines.`;
    }, [progress]);

    if (!isSignedIn) {
      return (
        <main className="mx-auto max-w-3xl p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Sign in to view your events</h2>
            <p className="mt-3 text-slate-600">
              The dashboard is tied to your account so you can view your own olympiad timeline entries.
            </p>
            <Link className="mt-6 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 hover:px-4.5 hover:py-2.5 duration-300 ease-in-out" href="/">
              Return home
            </Link>
          </div>
        </main>
      );
    }

    return (
        <main className="mx-auto max-w-8xl p-4">
            <div className="text-center mt-2 flex flex-col justify-center gap-3 sm:flex-row sm:items-stretch">
                <div className="bg-white w-full sm:w-1/4 rounded-2xl shadow-lg border border-slate-200 p-4">
                    <p className="p-1 text-sm text-slate-500">Experience</p>
                    <p className="p-1 text-2xl font-semibold">{progress?.experience ?? 0} XP</p>
                    <p className="p-1 text-sm">Level {progress?.level ?? 1}</p>
                </div>
                <div className="w-full sm:w-1/2 bg-white rounded-2xl shadow-lg border border-slate-200 flex-column items-center gap-3">
                    <form id="urlForm" className="mt-4 w-full flex flex-col gap-3 px-4 sm:ml-5 sm:flex-row sm:px-0" onSubmit={handleSubmit}>
                        <input
                            type="text"
                            id="url_bar"
                            name="url"
                            placeholder="Enter Olympiad URL"
                            className="border p-2 rounded w-full text-slate-800"
                        />
                        <button type="submit" className="rounded-lg bg-slate-800 px-4 py-2 m-1 text-sm font-semibold text-white hover:bg-slate-600 hover:px-4.5 hover:py-3 duration-300 ease-in-out">
                            Parse
                        </button>
                    </form>
                    <div className="dashboard-actions flex flex-wrap justify-center gap-2 px-3 pb-4 sm:px-0">
                        <button type="button" className="mt-4 rounded-lg bg-slate-800 px-4 py-2 m-1 text-sm font-semibold text-white hover:bg-slate-600 hover:px-4.5 hover:py-3 duration-300 ease-in-out" onClick={() => router.push("/manage")}> Manage Events </button>
                        <button type="button" className="mt-4 rounded-lg bg-slate-800 px-4 py-2 m-1 text-sm font-semibold text-white hover:bg-slate-600 hover:px-4.5 hover:py-3 duration-300 ease-in-out" onClick={() => router.push("/my_olympiads")}> My Olympiads </button>
                        <button type="button" className="mt-4 rounded-lg bg-slate-800 px-4 py-2 m-1 text-sm font-semibold text-white hover:bg-slate-600 hover:px-4.5 hover:py-3 duration-300 ease-in-out" onClick={() => router.push("/olympiad_hub")}> Olympiad Hub </button>
                    </div>
                </div>

                <div className="bg-white w-full sm:w-1/4 rounded-2xl shadow-lg border border-slate-200 p-4">
                    <p className="p-1 text-sm text-slate-500">Missed deadlines</p>
                    <p className="p-1 text-lg font-semibold">{missedMessage}</p>
                </div>
            </div>
            {/* Calendar Component */}
            <div className="flex flex-col items-start mt-10 gap-6 lg:flex-row lg:gap-10">
              {/*<aside className="surface h-fit p-3">
                <nav className="space-y-1 text-sm">
                  <a className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2" href="/dashboard"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-panel-left h-4 w-4" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M9 3v18"></path></svg> Dashboard</a>
                  <a className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-secondary" href="/my_olympiads"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trophy h-4 w-4" aria-hidden="true"><path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"></path><path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"></path><path d="M18 9h1.5a1 1 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"></path><path d="M6 9H4.5a1 1 0 0 1 0-5H6"></path></svg> My Olympiads</a>
                  <a className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-secondary" href="/manage"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-compass h-4 w-4" aria-hidden="true"><path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"></path><circle cx="12" cy="12" r="10"></circle></svg> Manage Events</a>
                </nav>
              </aside>
              */}
                <div className="w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold">Calendar</h2>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar-days h-3.5 w-3.5" aria-hidden="true"><path d="M8 2v4"></path><path d="M16 2v4"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><path d="M3 10h18"></path><path d="M8 14h.01"></path><path d="M12 14h.01"></path><path d="M16 14h.01"></path><path d="M8 18h.01"></path><path d="M12 18h.01"></path><path d="M16 18h.01"></path></svg> drag, drop, edit</span>
                  </div>
                  {!loading && <Calendar events={events} onEventsChanged={() => setRefreshToken((prev) => prev + 1)} />}
                </div>
                {/* Upcoming Events Component */}
                {!loading && <UpcomingEvents limit={5} refreshToken={refreshToken} />}
            </div>
            {/* Loading Overlay */}
            {loading && <LoadingOverlay />}
        </main>
    );
}
