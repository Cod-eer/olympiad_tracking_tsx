import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventContentArg } from "@fullcalendar/core";
import { DateClickArg } from "@fullcalendar/interaction";
import React, { useMemo, useState } from "react";

interface CalendarEvent {
    id?: number | string;
    title: string;
    start: string;
    end?: string;
    deadline?: string | null;
    daysToDeadline?: number | null;
    urgency?: number;
    urgencyLevel?: string;
    urgencyLabel?: string;
    deadlineStatus?: string;
    completed?: boolean;
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
}

const urgencyEventClasses: Record<string, string> = {
    completed: "bg-slate-300 text-slate-700 ring-1 ring-slate-200 line-through",
    overdue: "bg-red-100 text-red-950 ring-1 ring-red-300",
    critical: "bg-red-100 text-red-950 ring-1 ring-red-300",
    soon: "bg-yellow-100 text-yellow-950 ring-1 ring-yellow-300",
    normal: "bg-indigo-50 text-indigo-950 ring-1 ring-indigo-200",
    unknown: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
};

const calendarDateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
});

function setEventCompleted(eventId : Number, completed : Boolean) {
    const result = fetch(`/api/manage_events/${eventId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed: completed }),
    })

    return result
}

function formatEventDateRange(start: string, end?: string) {
    const startDate = new Date(start);
    if (Number.isNaN(startDate.getTime())) {
        return "";
    }
    if (!end) {
        return calendarDateFormatter.format(startDate);
    }
    const endDate = new Date(end);
    if (Number.isNaN(endDate.getTime())) {
        return calendarDateFormatter.format(startDate);
    }
    const sameDay = startDate.toDateString() === endDate.toDateString();
    if (sameDay) {
        return calendarDateFormatter.format(startDate);
    }
    return `${calendarDateFormatter.format(startDate)} - ${calendarDateFormatter.format(endDate)}`;
}

export default function Calendar({ events }: { events: CalendarEvent[] }) {
    const safeEvents = Array.isArray(events) ? events : [];
    const [customEvents, setCustomEvents] = useState<CalendarEvent[]>([]);
    const [completedEventIds, setCompletedEventIds] = useState<Record<string, boolean>>({});

    const calendarEvents = useMemo(() => [...safeEvents, ...customEvents].map((event) => {
        const id = event.id === undefined ? `generated-${event.start}-${event.title}` : String(event.id);
        const isCompleted = completedEventIds[id] ?? Boolean(event.completed);
        return {
            ...event,
            id,
            dateLabel: formatEventDateRange(event.start, event.end),
            urgencyScoreLabel: typeof event.urgency === "number" ? event.urgency.toFixed(2) : null,
            isCompleted,
        };
    }), [safeEvents, customEvents, completedEventIds]);

    return (
        <div className="w-full max-w-4xl mx-auto">
            <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                events={calendarEvents}
                selectable
                dateClick={(info: DateClickArg) => {
                    const title = window.prompt(`Add study item for ${info.dateStr}`, "");
                    if (!title || !title.trim()) {
                        return;
                    }
                    const trimmedTitle = title.trim();
                    setCustomEvents((prev) => ([
                        ...prev,
                        {
                            id: `custom-${Date.now()}`,
                            title: trimmedTitle,
                            start: info.dateStr,
                            end: info.dateStr,
                            urgencyLevel: "normal",
                            deadlineStatus: "Custom task",
                        },
                    ]));
                }}
                headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth,dayGridWeek,dayGridDay",
                }}
                eventContent={(info: EventContentArg) => {
                    const urgencyLevel = String(info.event.extendedProps.urgencyLevel ?? "unknown");
                    const deadlineStatus = String(info.event.extendedProps.deadlineStatus ?? "");
                    const isCompletedOlympiad = Boolean(info.event.extendedProps.isCompleted);
                    const urgencyClass = (isCompletedOlympiad ? urgencyEventClasses.completed : (urgencyEventClasses[urgencyLevel] ?? urgencyEventClasses.unknown));

                    return (
                        <div className={`rounded-sm px-1 py-0.5 leading-tight ${urgencyClass} ${isCompletedOlympiad ? "opacity-60" : ""}`}>
                            <div className="mb-0.5 flex items-center gap-1">
                                <button
                                    type="button"
                                    role="checkbox"
                                    aria-checked={isCompletedOlympiad}
                                    data-state={isCompletedOlympiad ? "checked" : "closed"}
                                    value="on"
                                    className="peer rounded-lg border-2 ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-none data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground h-5 w-5 shrink-0 border-foreground/20 bg-transparent"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        event.preventDefault();
                                        setEventCompleted(Number(info.event.id), !isCompletedOlympiad);
                                        setCompletedEventIds((prev) => ({
                                            ...prev,
                                            [info.event.id]: !isCompletedOlympiad,
                                        }));
                                    }}
                                >
                                    {isCompletedOlympiad && (
                                        <span data-state="checked" className="flex items-center justify-center text-current">
                                            <svg className="size-3.5" aria-hidden="true" width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path fillRule="evenodd" clipRule="evenodd" d="M19.3209 4.24472C20.0142 4.69807 20.2088 5.62768 19.7555 6.32105L11.2555 19.321C10.9972 19.7161 10.5681 19.9665 10.0971 19.997C9.62613 20.0276 9.16825 19.8347 8.86111 19.4764L4.36111 14.2264C3.82198 13.5974 3.89482 12.6504 4.52381 12.1113C5.1528 11.5722 6.09975 11.645 6.63888 12.274L9.83825 16.0066L17.2445 4.6793C17.6979 3.98593 18.6275 3.79136 19.3209 4.24472Z" fill="currentColor"></path>
                                            </svg>
                                        </span>
                                    )}
                                </button>
                                <div className="whitespace-normal break-words text-[10px] font-semibold uppercase opacity-75">
                                    {String(info.event.extendedProps.dateLabel ?? "")}
                                    {deadlineStatus && ` - ${deadlineStatus}`}
                                </div>
                            </div>
                            <div className="whitespace-normal break-words text-xs font-semibold">
                                {info.event.title}
                            </div>
                        </div>
                    );
                }}
                eventClick={(info) => {
                    const eventId = info.event.id;
                    const isCompleted = Boolean(info.event.extendedProps.isCompleted);
                    const shouldComplete = window.confirm(
                        isCompleted
                            ? `Mark "${info.event.title}" as active?`
                            : `Mark "${info.event.title}" as completed?`
                    );
                    if (!shouldComplete) {
                        return;
                    }
                    setCompletedEventIds((prev) => ({
                        ...prev,
                        [eventId]: !isCompleted,
                    }));
                }}
            />
        </div>
    );
}