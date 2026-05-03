import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventContentArg } from "@fullcalendar/core";
import React from "react";

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
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
}

const urgencyEventClasses: Record<string, string> = {
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
    const calendarEvents = safeEvents.map((event) => ({
        ...event,
        id: event.id === undefined ? undefined : String(event.id),
        dateLabel: formatEventDateRange(event.start, event.end),
        urgencyScoreLabel: typeof event.urgency === "number" ? event.urgency.toFixed(2) : null,
    }));

    return (
        <div className="w-full max-w-4xl mx-auto">
            <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                events={calendarEvents}
                headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth,dayGridWeek,dayGridDay",
                }}
                eventContent={(info: EventContentArg) => {
                    const urgencyLevel = String(info.event.extendedProps.urgencyLevel ?? "unknown");
                    const deadlineStatus = String(info.event.extendedProps.deadlineStatus ?? "");
                    const urgencyScore = info.event.extendedProps.urgencyScoreLabel as string | null;
                    const urgencyClass = urgencyEventClasses[urgencyLevel] ?? urgencyEventClasses.unknown;

                    return (
                        <div className={`rounded-sm px-1 py-0.5 leading-tight ${urgencyClass}`}>
                            <div className="whitespace-normal break-words text-[10px] font-semibold uppercase opacity-75">
                                {String(info.event.extendedProps.dateLabel ?? "")}
                                {deadlineStatus && ` - ${deadlineStatus}`}
                            </div>
                            <div className="whitespace-normal break-words text-xs font-semibold">
                                {info.event.title}
                            </div>
                        </div>
                    );
                }}
                eventClick={(info) => {
                    const deadlineStatus = String(info.event.extendedProps.deadlineStatus ?? "");
                    alert(deadlineStatus ? `${info.event.title}\n${deadlineStatus}` : info.event.title);
                }}
            />
        </div>
    );
}
