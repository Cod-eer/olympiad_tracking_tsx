import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function getAuthorizedUserId(req) {
  const { userId } = getAuth(req);
  return userId ?? null;
}

export async function GET(req, { params }) {
  try {
    const { OlympiadId } = await params;
    const userId = getAuthorizedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: olympiadData, error: olympiadError } = await supabase
      .from('olympiads')
      .select('id, name, url, organizers, fees, rewards, requirements')
      .eq('id', OlympiadId)
      .limit(1);
    if (olympiadError) {
      throw olympiadError;
    }

    if (!olympiadData || olympiadData.length === 0) {
      return NextResponse.json({ error: 'Olympiad not found' }, { status: 404 });
    }

    const olympiad = olympiadData[0];

    const { data: eventsData, error: eventsError } = await supabase
      .from('event_access')
      .select('role, olympiad_events!inner(id, action, date_start, date_end, olympiad_id, completed)')
      .eq('user_id', userId)
      .eq('olympiad_events.olympiad_id', OlympiadId)
      .order('date_start', { ascending: true, referencedTable: 'olympiad_events' });

    if (eventsError) {
      throw eventsError;
    }

    const events = eventsData.map((event) => ({
      id: event.olympiad_events.id,
      action: event.olympiad_events.action,
      start: event.olympiad_events.date_start,
      end: event.olympiad_events.date_end,
      completed: event.olympiad_events.completed,
      role: event.role
    }));

    return NextResponse.json({ olympiad : olympiad, events: events });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}