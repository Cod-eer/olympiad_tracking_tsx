"use client";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import Calendar from "../components/fullcalendar";
import LoadingOverlay  from "../components/loading";
import "../globals.css";
import UpcomingEvents from "../components/upcoming-events";


interface Event {
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
    useEffect(() => {
        fetch("/api/show_events")
            .then((res) => res.json())
            .then((data) => setEvents(data))
            .catch((err) => console.error(err));
    }, []);

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
                {!loading && <Calendar events={events} />}
                {/* Upcoming Events Component */}
                {!loading && <UpcomingEvents limit={5} />}
            </div>
            {/* Loading Overlay */}
            {loading && <LoadingOverlay />}
        </main>
    );
}
