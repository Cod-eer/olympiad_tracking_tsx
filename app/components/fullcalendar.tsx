import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventContentArg, EventClickArg, EventDropArg } from "@fullcalendar/core";
import { DateClickArg } from "@fullcalendar/interaction";
import React, { useEffect, useMemo, useState } from "react";

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

interface OlympiadOption {
    id: number;
    name: string;
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

function setEventCompleted(eventId: number, completed: boolean) {
    return fetch(`/api/manage_events/${eventId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed }),
    });
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

function shiftDateString(dateString: string, days: number) {
    const date = new Date(`${dateString}T00:00:00`);
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toInputDate(value?: string) {
    if (!value) {
        return "";
    }
    return value.slice(0, 10);
}

export default function Calendar({ events, onEventsChanged }: { events: CalendarEvent[]; onEventsChanged?: () => void }) {
    const safeEvents = Array.isArray(events) ? events : [];
    const [completedEventIds, setCompletedEventIds] = useState<Record<string, boolean>>({});
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createDate, setCreateDate] = useState("");
    const [createTitle, setCreateTitle] = useState("");
    const [createOlympiadId, setCreateOlympiadId] = useState("");
    const [createEndDate, setCreateEndDate] = useState("");
    const [olympiads, setOlympiads] = useState<OlympiadOption[]>([]);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editStartDate, setEditStartDate] = useState("");
    const [editEndDate, setEditEndDate] = useState("");
    const [editOlympiadId, setEditOlympiadId] = useState("");
    useEffect(() => {
        fetch("/api/manage_events", { cache: "no-store" })
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data?.olympiads)) {
                    setOlympiads(data.olympiads);
                }
            })
            .catch(() => setOlympiads([]));
    }, []);

    const calendarEvents = useMemo(() => safeEvents.map((event) => {
        const id = event.id === undefined ? `generated-${event.start}-${event.title}` : String(event.id);
        const isCompleted = completedEventIds[id] ?? Boolean(event.completed);
        return {
            ...event,
            id,
            dateLabel: formatEventDateRange(event.start, event.end),
            urgencyScoreLabel: typeof event.urgency === "number" ? event.urgency.toFixed(2) : null,
            isCompleted,
        };
    }), [safeEvents, completedEventIds]);

    async function handleCreateEvent() {
        if (!createTitle.trim() || !createOlympiadId || !createEndDate || !createDate) {
            return;
        }

        await fetch("/api/manage_events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                description: createTitle.trim(),
                startDate: createDate,
                endDate: createEndDate,
                olympiadId: Number(createOlympiadId),
            }),
        });

        setIsCreateModalOpen(false);
        setCreateTitle("");
        setCreateOlympiadId("");
        setCreateEndDate("");
        onEventsChanged?.();
    }

    function getInclusiveEndDate(endStr: string | null, startStr: string) {
        const normalizedStart = toInputDate(startStr);
        if (!endStr) {
            return normalizedStart;
        }
        const normalizedEnd = toInputDate(endStr);
        return shiftDateString(normalizedEnd, 0);
    }

    async function handleDeleteEvent(eventId: string) {
        await fetch(`/api/manage_events/${eventId}`, { method: "DELETE" });
        setEditingEventId(null);
        onEventsChanged?.();
    }

    async function handleUpdateEvent() {
        if (!editingEventId || !editTitle.trim() || !editStartDate || !editEndDate || !editOlympiadId) {
            return;
        }

        await fetch(`/api/manage_events/${editingEventId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                description: editTitle.trim(),
                startDate: editStartDate,
                endDate: editEndDate,
                olympiadId: Number(editOlympiadId),
            }),
        });

        setEditingEventId(null);
        onEventsChanged?.();
    }

    return (
        <div className="w-full max-w-6xl mx-auto">
            <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridWeek"
                events={calendarEvents}
                selectable
                editable
                dateClick={(info: DateClickArg) => {
                    setCreateDate(info.dateStr);
                    setCreateEndDate(info.dateStr);
                    setIsCreateModalOpen(true);
                }}
                eventClick={(info : EventClickArg) => {
                    const event = info.event;
                    setEditingEventId(event.id);
                    setEditTitle(event.title);
                    setEditStartDate(toInputDate(event.startStr));
                    setEditEndDate(toInputDate(event.endStr || event.startStr));
                    setEditOlympiadId(String(event.extendedProps.olympiad_id ?? ""));
                }}
                eventDrop={async (info : EventDropArg) => {
                    const startDate = toInputDate(info.event.startStr);
                    const endDate = toInputDate(info.event.endStr || info.event.startStr);
                    const olympiadId = Number(info.event.extendedProps.olympiad_id);
                    const response = await fetch(`/api/manage_events/${info.event.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            description: info.event.title,
                            startDate,
                            endDate,
                            olympiadId,
                        }),
                    });
                    if (!response.ok) {
                        info.revert();
                        return;
                    }
                    onEventsChanged?.();
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
                                    onClick={async (event) => {
                                        event.stopPropagation();
                                        event.preventDefault();
                                        await setEventCompleted(Number(info.event.id), !isCompletedOlympiad);
                                        setCompletedEventIds((prev) => ({
                                            ...prev,
                                            [info.event.id]: !isCompletedOlympiad,
                                        }));
                                        onEventsChanged?.();
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
                                <p className="text-[8px] opacity-75"> {info.event.extendedProps.olympiadTitle}</p>
                                {info.event.title}
                            </div>
                        </div>
                    );
                }}
            />

            {isCreateModalOpen && (
                <form className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
                        <h3 className="text-lg font-semibold text-slate-900">Create event for {createDate}</h3>
                        <div className="mt-4 space-y-3">
                            <select className="w-full rounded-lg border border-slate-300 p-2" value={createOlympiadId} onChange={(e) => setCreateOlympiadId(e.target.value)}>
                                <option value="">Select olympiad</option>
                                {olympiads.map((olympiad) => <option key={olympiad.id} value={olympiad.id}>{olympiad.name}</option>)}
                            </select>
                            <input className="w-full rounded-lg border border-slate-300 p-2" placeholder="Event name" value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} />
                            <input className="w-full rounded-lg border border-slate-300 p-2" type="date" value={createEndDate} min={createDate} onChange={(e) => setCreateEndDate(e.target.value)} />
                        </div>
                        <div className="mt-5 flex justify-end gap-2">
                            <button type="button" className="rounded-lg border bg-slate-200 px-3 py-2 text-sm text-black hover:bg-slate-100 hover:px-3.5 hover:py-1.5 duration-300 hover:cursor-pointer" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                            <button type="button" className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700 hover:px-3.5 hover:py-1.5 duration-300 hover:cursor-pointer" disabled={!createTitle.trim() || !createOlympiadId || !createEndDate} onClick={handleCreateEvent}>Save</button>
                        </div>
                    </div>
                </form>
            )}
            {editingEventId && (
                <form className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
                        <h3 className="text-lg font-semibold text-slate-900">Edit event</h3>
                        <div className="mt-4 space-y-3">
                            <select className="w-full rounded-lg border border-slate-300 p-2" value={editOlympiadId} onChange={(e) => setEditOlympiadId(e.target.value)}>
                                <option value="">Select olympiad</option>
                                {olympiads.map((olympiad) => <option key={olympiad.id} value={olympiad.id}>{olympiad.name}</option>)}
                            </select>
                            <input className="w-full rounded-lg border border-slate-300 p-2" placeholder="Event name" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                            <input className="w-full rounded-lg border border-slate-300 p-2" type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} />
                            <input className="w-full rounded-lg border border-slate-300 p-2" type="date" value={editEndDate} min={editStartDate} onChange={(e) => setEditEndDate(e.target.value)} />
                        </div>
                        <div className="mt-5 flex justify-between gap-2">
                            <button type="button" className="rounded-md bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-500 hover:px-3.5 hover:py-1.5 duration-300" onClick={() => handleDeleteEvent(editingEventId)}>Delete</button>
                            <div className="flex gap-2">
                                <button type="button" className="rounded-lg border bg-slate-200 px-3 py-2 text-sm text-black hover:bg-slate-100 hover:px-3.5 hover:py-1.5 duration-300" onClick={() => setEditingEventId(null)}>Cancel</button>
                                <button type="button" className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700 hover:px-3.5 hover:py-1.5 duration-300" disabled={!editTitle.trim() || !editOlympiadId || !editStartDate || !editEndDate} onClick={handleUpdateEvent}>Save</button>
                            </div>
                        </div>
                    </div>
                </form>
            )}
        </div>
    );
}
