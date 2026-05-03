import { NextResponse } from 'next/server';
import { getAuth } from "@clerk/nextjs/server";
import { createClient } from '@supabase/supabase-js';
import { addDeadlineUrgency } from '../../../lib/deadlines.js';


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

    // Fetch events where user has access
    const { data: eventsData, error } = await supabase
      .from('event_access')
      .select(`
        event_id,
        role,
        olympiad_events (
          action,
          date_start,
          date_end,
          olympiads (name)
        )
      `)
      .eq('user_id', userId);

    if (error) throw error;

    // Map results to calendar-friendly format
    const events = (eventsData ?? [])
      .map((ea) => ea.olympiad_events)
      .filter(Boolean)
      .map((event) => addDeadlineUrgency({
        title: `${event.olympiads?.name ?? 'Olympiad'} - ${event.action}`,
        start: event.date_start,
        end: event.date_end,
      }));

    return NextResponse.json(events);
  } catch (err) {
    console.error("Error fetching events:", err);
    return NextResponse.json(
      { error: "Failed to fetch events", details: err.message },
      { status: 500 }
    );
  }
}
