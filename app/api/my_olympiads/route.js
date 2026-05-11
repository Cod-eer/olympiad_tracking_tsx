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

export async function GET(req) {
  const userId = getAuthorizedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: access, error : accessError } = await supabase
    .from('event_access')
    .select('event_id')
    .eq('user_id', userId);
  if (accessError) {
    throw accessError;
  }
  const EventsIds = access.map(row => row.event_id);
  const { data: olympiadEvents, error: olympiadEventsError } = await supabase
    .from('olympiad_events')
    .select('olympiad_id, completed')
    .in('id', EventsIds);
  if (olympiadEventsError) {
    throw olympiadEventsError;
  }
  const OlympiadIds = olympiadEvents.map(row => row.olympiad_id);
  const { data: olympiads, error: olympiadsError } = await supabase
    .from('olympiads')
    .select('id, name, url')
    .in('id', OlympiadIds);
  if (olympiadsError) {
    throw olympiadsError;
  }

  const completionMap = new Map();
  olympiadEvents.forEach((event) => {
    const key = event.olympiad_id;
    const current = completionMap.get(key);
    completionMap.set(key, current === undefined ? Boolean(event.completed) : current && Boolean(event.completed));
  });

  const data = olympiads.map(row => ({
    id: row.id,
    name: row.name,
    url: row.url,
    completed: completionMap.get(row.id) ?? false,
  }));

  return NextResponse.json({ olympiads : data });
}

