import { NextResponse } from 'next/server';
import { getAuth } from "@clerk/nextjs/server";
import { createClient } from '@supabase/supabase-js';
import { addDeadlineUrgency, isUpcomingDeadline, sortByDeadlineUrgency } from '../../../lib/deadlines.js';


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);


export async function GET(req) {
  try {
    const { userId: authenticatedUserId } = getAuth(req);

    if (!authenticatedUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authenticatedUserId;

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit")) || 5;
    // fetch events from event_access
    const { data: eventsData, error: eventsError } = await supabase
      .from('event_access')
      .select(`
        event_id,
        role,
        olympiad_events (
          id,
          olympiad_id,
          action,
          date_start,
          date_end,
          olympiads (name)
        )
      `)
      .eq('user_id', userId)

    if (eventsError) {
      throw eventsError;
    }
    // map
    const upcoming_events = eventsData
      .map((row) => addDeadlineUrgency({
        id: row.olympiad_events.id,
        olympiad_id: row.olympiad_events.olympiad_id,
        name: row.olympiad_events.olympiads.name,
        action: row.olympiad_events.action,
        start: row.olympiad_events.date_start,
        end: row.olympiad_events.date_end,
      }))
      .filter(isUpcomingDeadline)
      .sort(sortByDeadlineUrgency)
      .slice(0, limit);

    return NextResponse.json(upcoming_events);
  } catch (err) {
    console.error("Error fetching upcoming events:", err);
    return NextResponse.json(
      { error: "Failed to fetch upcoming events", details: err.message },
      { status: 500 }
    );
  }
}
