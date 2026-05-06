"use client";

import "./globals.css";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useRef } from "react";
import Calendar from "./components/fullcalendar";
import LoadingOverlay from "./components/loading";
import UpcomingEvents from "./components/upcoming-events";

interface Event {
    title: string;
    start: string;
    end?: string;
}

const goals = [
  "Bring olympiad schedules from different organizations into one place.",
  "Reduce manual tracking with clear, searchable timelines.",
  "Help students stay aligned with reminders, updates, and result deadlines.",
];

const managerDemoFeatures = [
    {
        title: "Source parsing",
        description:
            "Paste an olympiad URL to parse competition data and get all deadlines, eligibility criteria, and important dates.",
    },
    {
        title: "Calendar intelligence",
        description:
            "Visualize contest phases in month/week/day view to detect overlaps and planning risk early.",
    },
    {
        title: "Upcoming workflow",
        description:
            "Review the next actionable events so you can view or edit registrations, exams, and submissions.",
    },
];

export default function Landing() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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

    const [limit, setLimit] = useState(5);
    const calendarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!calendarRef.current) return;

        const updateLimit = () => {
            const height = calendarRef.current!.offsetHeight;
            const itemHeight = 180;
            const newLimit = Math.max(1, Math.floor(height / itemHeight));
            setLimit(newLimit);
        };
        updateLimit();

        window.addEventListener("resize", updateLimit);
        return () => window.removeEventListener("resize", updateLimit);
    }, []);

    return (
        <main className="mx-auto px-6 py-3">
            <section className=" grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl bg-white p-6 shadow-md">
                    <h2 className="mb-3 text-2xl font-semibold text-slate-800">Our Aim</h2>
                    <p className="text-slate-600 text-base leading-relaxed max-w-prose tracking-[0.01em] break-keep">
                        Build an interactive planning platform that helps students track, manage, and edit all of the events they are involved in.
                    </p>
                </div>

                <div className="rounded-2xl bg-white p-6 shadow-md">
                    <h2 className="mb-3 text-2xl font-semibold text-slate-800">Our Goals</h2>
                    <ul className="list-disc space-y-2 pl-5 text-slate-600">
                        {goals.map((goal) => (
                            <li key={goal}>{goal}</li>
                        ))}
                    </ul>
                </div>
            </section>

            <section className="mt-8 rounded-2xl bg-white p-6 shadow-md">
                <h2 className="text-2xl font-semibold text-slate-800">Parse any olympiad websites</h2>
                <p className="mt-2 text-slate-600">
                    Trackolymp.tech will parse all the important information from any olympiad website and present it in a user-friendly way.
                </p>

                <form id="urlForm" className="mt-6 flex flex-col gap-3 md:flex-row" onSubmit={handleSubmit}>
                    <input
                        type="text"
                        id="url_bar"
                        name="url"
                        placeholder="Enter Olympiad URL"
                        className="w-full rounded-lg border border-slate-300 p-3"
                    />
                    <button
                        type="submit"
                        className="rounded-lg bg-slate-800 px-4 py-2 m-3 text-sm font-semibold text-white hover:bg-slate-600 hover:px-4.5 hover:py-3 duration-300 ease-in-out"
                    >
                        Run Manager Parser Demo
                    </button>
                </form>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                    {managerDemoFeatures.map((feature) => (
                        <article key={feature.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <h3 className="text-lg font-semibold text-slate-800">{feature.title}</h3>
                            <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="mt-8 rounded-2xl bg-white p-6 shadow-md">
                <div className="flex flex-col border-b border-slate-500 pb-6">
                    <h2 className="text-2xl font-semibold text-slate-800">Calendar Demo</h2>
                    <p className="mt-2 text-slate-600">
                        Interactive timeline preview for current and upcoming olympiad events.
                    </p>
                </div>
                <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
                    <div ref={calendarRef}>
                        {!loading && <Calendar events={events} />}
                    </div>
                    {!loading && <UpcomingEvents limit={limit} />}
                </div>
            </section>

            {loading && <LoadingOverlay />}
        </main>
    );
}