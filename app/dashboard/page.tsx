"use client";

import "../globals.css";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import Calendar from "../components/fullcalendar";
import LoadingOverlay  from "../components/loading";
import UpcomingEvents from "../components/upcoming-events";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";


interface Event {
  id?: number;
  olympiadId?: number;
  title: string;
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
    useEffect(() => {
        fetch("/api/show_events")
            .then((res) => res.json())
            .then((data) => setEvents(data))
            .catch((err) => console.error(err));
    }, [refreshToken]);

    const { isSignedIn, isLoaded } = useUser();

    if (!isSignedIn) {
      return (
        <main className="mx-auto max-w-3xl p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Sign in to view your events</h2>
            <p className="mt-3 text-slate-600">
              The dashboard is tied to your account so you can view your own olympiad timeline entries.
            </p>
            <Link className="mt-6 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 hover:px-4.5 hover:py-3 duration-300 ease-in-out" href="/">
              Return home
            </Link>
          </div>
        </main>
      );
    }

    return (
        <main className="p-6">
            <div className="text-center mt-10 flex justify-center items-baseline gap-3">
                <form id="urlForm" className="mt-4 flex gap-3" onSubmit={handleSubmit}>
                    <input
                        type="text"
                        id="url_bar"
                        name="url"
                        placeholder="Enter Olympiad URL"
                        className="border p-2 rounded w-full"
                    />
                    <button type="submit" className="rounded-lg bg-slate-800 px-4 py-2 m-1 text-sm font-semibold text-white hover:bg-slate-600 hover:px-4.5 hover:py-3 duration-300 ease-in-out">
                        Parse
                    </button>
                </form>
                <button type="button" className="rounded-lg bg-slate-800 px-4 py-2 m-1 text-sm font-semibold text-white hover:bg-slate-600 hover:px-4.5 hover:py-3 duration-300 ease-in-out" onClick={() => router.push("/manage")}> Manage Events </button>
                <button type="button" className="rounded-lg bg-slate-800 px-4 py-2 m-1 text-sm font-semibold text-white hover:bg-slate-600 hover:px-4.5 hover:py-3 duration-300 ease-in-out" onClick={() => router.push("/my_olympiads")}> My Olympiads </button>
            </div>
            {/* Calendar Component */}
            <div className="flex flex-row items-top mt-30 gap-10">
                {!loading && <Calendar events={events} onEventsChanged={() => setRefreshToken((prev) => prev + 1)} />}
                {/* Upcoming Events Component */}
                {!loading && <UpcomingEvents limit={5} refreshToken={refreshToken} />}
            </div>
            {/* Loading Overlay */}
            {loading && <LoadingOverlay />}
        </main>
    );
}
