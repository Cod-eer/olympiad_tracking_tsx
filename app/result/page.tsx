"use client"; // Needed for client-side hooks in Next.js App Router

import React, { useEffect, useState } from "react";

type ParsedData = {
  name: string[];
  url: string;
  dates: any[];
  billing: any[];
  requirements: any[];
  rewards: any[];
  organizers: any[];
};

export default function ResultsPage() {
  const [data, setData] = useState<ParsedData | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("parsedData");
    setData(stored? JSON.parse(stored) : null);
  }, []);

  function buildList(items: any[]) {
    if (!items || items.length === 0) return <p>Not specified</p>;

    return (
      <ul>
        {items.map((item, i) =>
          typeof item === "string" ? (
            <li key={i}>{item}</li>
          ) : (
            <li key={i}>
              {item.main}
              {item.subitems && (
                <ul>
                  {item.subitems.map((sub: string, j: number) => (
                    <li key={j}>{sub}</li>
                  ))}
                </ul>
              )}
            </li>
          )
        )}
      </ul>
    );
  }

  async function handleAddEvent() {
    if (!data) return;

    try {
      const response = await fetch("/add_event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (result.success) {
        alert("Event added successfully!");
        window.location.href = "/";
      } else {
        alert("Failed to add event.");
        console.error(result.error);
      }
    } catch (err) {
      console.error("Error adding event:", err);
    }
  }

  if (!data) {
    return <p>Error loading data. Please try again.</p>;
  }

  return (
    <div>
      <div className="name-button">
        <h4>{data.name[0]}</h4>
        <h5>{data.url}</h5>
        <button type="button" onClick={handleAddEvent}>
          Add Event
        </button>
      </div>

      <div className="box">
        <h2>📅 Dates</h2>
        {buildList(data.dates)}
      </div>
      <div className="box">
        <h2>💳 Billing</h2>
        {buildList(data.billing)}
      </div>
      <div className="box">
        <h2>📋 Requirements</h2>
        {buildList(data.requirements)}
      </div>
      <div className="box">
        <h2>👥 Organizers</h2>
        {buildList(data.organizers)}
      </div>
      <div className="box">
        <h2>🏅 Rewards</h2>
        {buildList(data.rewards)}
      </div>
    </div>
  );
}
