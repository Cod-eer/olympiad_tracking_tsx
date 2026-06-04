"use client";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";


export default function OlympiadHub() {
    const [olympiads, setOlympiads] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const router = useRouter();

    const filteredOlympiads = useMemo(() => {
        if (!searchQuery) return olympiads;
        const lowerQuery = searchQuery.toLowerCase();
        return olympiads.filter((olympiad) =>
            olympiad.name.toLowerCase().includes(lowerQuery) ||
            olympiad.description.toLowerCase().includes(lowerQuery)
        );
    }, [olympiads, searchQuery]);

    useEffect(() => {
        fetch("/api/olympiad_hub", { cache: "no-store" })
            .then((res) => res.json())
            .then((data) => setOlympiads(data))
            .catch((err) => console.error(err));
    }, []);

    return (
        <div className="flex flex-col items-center min-h-screen p-4">
            <h1 className="text-2xl font-bold mb-4">Olympiad Hub</h1>
            <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by olympiad or event"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            {filteredOlympiads.length === 0 ? (
                <p>No olympiads found.</p>
            ) : (
                <ul className="space-y-4">
                    {filteredOlympiads.map((olympiad) => (
                        <li key={olympiad.id} className="border p-4 rounded">
                            <div className="flex justify-between mb-2">
                                <h2 className="text-xl font-bold">{olympiad.name}</h2>
                                <button className="text-sm text-blue-500 hover:underline" onClick={() => router.push(`/olympiad_hub/${olympiad.name.replace(/\s+/g, "-").toLowerCase()}`)}>
                                    View Details
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>

    );
}