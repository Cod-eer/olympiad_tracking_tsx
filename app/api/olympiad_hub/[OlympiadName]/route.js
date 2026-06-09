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
    const { OlympiadName } = await params;
    const userId = getAuthorizedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: olympiadData, error: olympiadError } = await supabase
      .from('verified_olympiads')
      .select('id, name, url, organizers, fees, rewards, requirements')
      .eq('dashed_name', OlympiadName)
      .limit(1);
    if (olympiadError) {
      throw olympiadError;
    }
    console.log(olympiadData);

    if (!olympiadData || olympiadData.length === 0) {
      return NextResponse.json({ error: 'Olympiad not found' }, { status: 404 });
    }

    const olympiad = olympiadData[0];

    const { data: eventsData, error: eventsError } = await supabase
      .from('verified_events')
      .select('action, date_start, date_end')
      .eq('olympiad_id', olympiad.id)

    if (eventsError) {
      throw eventsError;
    }

    const events = eventsData.map((event) => ({
      id: event.id,
      action: event.action,
      start: event.date_start,
      end: event.date_end,
    }));

    return NextResponse.json({ olympiad : olympiad, events: events });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const { OlympiadName } = await params;
    const userId = getAuthorizedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: olympiadData, error: olympiadError } = await supabase
      .from('verified_olympiads')
      .select('id, name, url, organizers, fees, rewards, requirements')
      .eq('dashed_name', OlympiadName)
      .limit(1);
    if (olympiadError) {
      throw olympiadError;
    }

    if (!olympiadData || olympiadData.length === 0) {
      return NextResponse.json({ error: 'Olympiad not found' }, { status: 404 });
    }

    const olympiad = olympiadData[0];

    const { data: eventsData, error: eventsError } = await supabase
      .from('verified_events')
      .select('id, action, date_start, date_end')
      .eq('olympiad_id', olympiad.id)

    if (eventsError) {
      throw eventsError;
    }

    for (const i of eventsData) {
      const { data: eventData, error: eventError } = await supabase
      .from('olympiad_events')
      .insert({
        olympiad_id: olympiad.id,
        action: i.action,
        date_start: i.date_start,
        date_end: i.date_end,
      })
      .select('id')
      .single();

      if (eventError) {
        if (eventError.code === '23505') continue;
        throw eventError;
      }
      const { data: accessData, error: accessError } = await supabase
      .from('event_access')
      .insert({
        event_id: eventData[0].id,
        user_id: userId,
        role: (userId === process.env.BASE_USER_ID) ? 'admin' : 'viewer'
      })

      if (accessError) {
        if (accessError.code === '23505') continue;
        throw accessError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}