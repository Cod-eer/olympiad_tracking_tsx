import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { calculateExperience } from '../../../lib/experience';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: accessRows, error: accessError } = await supabase
      .from('event_access')
      .select('event_id')
      .eq('user_id', userId);

    if (accessError) throw accessError;

    const eventIds = (accessRows ?? []).map((row) => row.event_id);
    if (eventIds.length === 0) {
      const base = { totalOlympiads: 0, completedOlympiads: 0, totalEvents: 0, completedEvents: 0, missedEvents: 0 };
      return NextResponse.json({ ...base, ...calculateExperience(base) });
    }

    const { data: events, error: eventsError } = await supabase
      .from('olympiad_events')
      .select('id, olympiad_id, completed, date_end')
      .in('id', eventIds);

    if (eventsError) throw eventsError;

    const totalEvents = events.length;
    const completedEvents = events.filter((event) => Boolean(event.completed)).length;
    const olympiadIds = [...new Set(events.map((event) => event.olympiad_id))];
    const totalOlympiads = olympiadIds.length;

    const completedOlympiadSet = new Set(
      olympiadIds.filter((olympiadId) => {
        const olympiadEvents = events.filter((event) => event.olympiad_id === olympiadId);
        return olympiadEvents.length > 0 && olympiadEvents.every((event) => Boolean(event.completed));
      })
    );

    const now = new Date();
    const missedEvents = events.filter((event) => !event.completed && event.date_end && new Date(event.date_end) < now).length;

    const counts = {
      totalOlympiads,
      completedOlympiads: completedOlympiadSet.size,
      totalEvents,
      completedEvents,
      missedEvents,
    };

    return NextResponse.json({ ...counts, ...calculateExperience(counts) });
  } catch (error) {
    console.error('Error fetching user progress:', error);
    return NextResponse.json({ error: 'Failed to fetch user progress', details: error.message }, { status: 500 });
  }
}

