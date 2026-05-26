"use client"

import { Mail, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

interface Event {
    id: number;
    olympiad_id: number;
    name: string;
    action: string;
    start: string;
    end: string;
    completed?: boolean;
    deadline?: string | null;
    daysToDeadline?: number | null;
    urgency?: number;
    urgencyLevel?: string;
    urgencyLabel?: string;
    deadlineStatus?: string;
}

const urgencyStyles: Record<string, { item: string; badge: string; bar: string }> = {
    overdue: {
        item: "border-red-300 bg-red-50",
        badge: "bg-red-100 text-red-800 ring-red-200",
        bar: "bg-red-500",
    },
    critical: {
        item: "border-red-300 bg-red-50",
        badge: "bg-red-100 text-red-800 ring-red-200",
        bar: "bg-red-500",
    },
    soon: {
        item: "border-yellow-300 bg-yellow-50",
        badge: "bg-yellow-100 text-yellow-900 ring-yellow-200",
        bar: "bg-yellow-500",
    },
    normal: {
        item: "border-indigo-200 bg-indigo-50",
        badge: "bg-indigo-100 text-indigo-800 ring-indigo-200",
        bar: "bg-indigo-500",
    },
    unknown: {
        item: "border-slate-200 bg-white",
        badge: "bg-slate-100 text-slate-700 ring-slate-200",
        bar: "bg-slate-400",
    },
    completed: {
        item: "border-green-300 bg-green-50",
        badge: "bg-green-100 text-green-800 ring-green-200",
        bar: "bg-green-500",
    }
};

function formatDate(value?: string | null) {
    if (!value) {
        return "No date";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "Invalid date";
    }

    return date.toLocaleDateString();
}

export default function UpcomingEvents({ limit, refreshToken = 0 }: { limit: number; refreshToken?: number }) {
    const [upcoming_events, setEvents] = useState<Event[]>([]);
    const [isSendingBriefing, setIsSendingBriefing] = useState(false);
    const [briefingStatus, setBriefingStatus] = useState<string | null>(null);

    useEffect(() => {
        fetch(`/api/upcoming?limit=${limit}`)
            .then(async (res) => {
              const data = await res.json();
              if (!res.ok) {
                return [];
              }
              // Checking if the data is an array
              if (!Array.isArray(data)) {
                console.error("Unexpected data format from /api/upcoming:", data);
                return [];
              }
              return data;
            })
            .then((data) => setEvents(data))
            .catch((err) => {
                console.error("Error fetching upcoming events:", err);
                setEvents([]); // fallback to empty array to prevent .map errors
            });
    }, [limit, refreshToken]);

    async function sendBriefing() {
        setIsSendingBriefing(true);
        setBriefingStatus(null);

        try {
            const response = await fetch("/api/deadline_briefing", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ lookaheadDays: 7 }),
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.details || data.error || "Unable to send briefing.");
            }

            setBriefingStatus(data.sent
                ? `Briefing sent to ${data.to}.`
                : data.message || "No deadlines this week.");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to send briefing.";
            setBriefingStatus(message);
        } finally {
            setIsSendingBriefing(false);
        }
    }

    if (upcoming_events.length === 0) {

        return (
            <div className="max-w-3xl h-auto mx-auto mt-10 ml-15 flex flex-col items-center
                bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <p className="text-center text-gray-500">There are no upcoming events</p>
            </div>
        );
    }
    return (
        <div className="max-w-3xl h-auto mx-auto flex flex-col items-center
                bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <div className="mb-4 flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="flex items-center gap-2 text-base font-semibold"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bell-ring h-4 w-4" aria-hidden="true"><path d="M10.268 21a2 2 0 0 0 3.464 0"></path><path d="M22 8c0-2.3-.8-4.3-2-6"></path><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"></path><path d="M4 2C2.8 3.7 2 5.7 2 8"></path></svg>Upcoming</h2>
                <button
                    type="button"
                    onClick={sendBriefing}
                    disabled={isSendingBriefing}
                    className="inline-flex items-center justify-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                    {isSendingBriefing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                    Email
                </button>
            </div>
            {briefingStatus && (
                <p className="mb-4 w-full rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
                    {briefingStatus}
                </p>
            )}
            <ul className="w-full space-y-4">
                {upcoming_events.map((event) => {
                    const level = event.urgencyLevel ?? "unknown";
                    const urgencyScore = typeof event.urgency === "number" ? event.urgency.toFixed(2) : "0.00";
                    const isCompleted = Boolean(event.completed);
                    const styles = (isCompleted ? urgencyStyles.completed : urgencyStyles[level]) ?? urgencyStyles.unknown;
                    return (
                        <li key={`${event.id}-${event.olympiad_id}`} className={`relative overflow-hidden rounded-lg border p-4 shadow-sm transition duration-300 hover:shadow-md ${styles.item} ${isCompleted ? "opacity-50" : ""}`}>
                            <div className={`absolute bottom-0 left-0 top-0 w-1 ${styles.bar}`} />
                            <div className="flex flex-col gap-2 pl-2">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <div className="font-semibold text-slate-950">{event.name} {isCompleted ? "(Completed)" : ""}</div>
                                        <div className="text-sm text-slate-700">{event.action}</div>
                                    </div>
                                    <span className={`inline-flex w-fit rounded-full px-2 py-1 text-xs font-semibold ring-1 ${styles.badge}`}>
                                        {event.urgencyLabel ?? "Unknown"}
                                    </span>
                                </div>
                                <div className="text-sm text-slate-700">
                                    {formatDate(event.start)}{" - "}{formatDate(event.end)}
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-700">
                                    <span>{event.deadlineStatus ?? "No deadline"}</span>
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
