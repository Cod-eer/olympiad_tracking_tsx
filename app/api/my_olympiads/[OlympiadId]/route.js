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

    const { data: olympiadData, error: olmpiadError } = await supabase
      .from('olympiads')
      .select('id, name, url, organizers, fees, rewards, requirements')
      .eq('id', OlympiadId)
      .limit(1);
    if (olmpiadError) {
      throw olmpiadError;
    }

    if (!olympiadData || olympiadData.length === 0) {
      return NextResponse.json({ error: 'Olympiad not found' }, { status: 404 });
    }

    const olympiad = olympiadData[0];

    const { data: eventsData, error: eventsError } = await supabase
      .from('event_access')
      .select('role, olympiad_events!inner(id, action, date_start, date_end, olympiad_id)')
      .eq('user_id', userId)
      .eq('olympiad_events.olympiad_id', OlympiadId)
      .order('date_start', { ascending: true, foreignTable: 'olympiad_events' });

    if (eventsError) {
      throw eventsError;
    }

    const events = eventsData.map((event) => ({
      id: event.olympiad_events.id,
      action: event.olympiad_events.action,
      start: event.olympiad_events.date_start,
      end: event.olympiad_events.date_end,
      role: event.role
    }));

    return NextResponse.json({ olympiad : olympiad, events: events });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


export async function PUT(req, { params }) {
  try {
    const { OlympiadId } = await params;
    const payload = await req.json();
    const name = payload?.name?.trim();
    const url = payload?.url?.trim() || null;

    if (!name) {
      return NextResponse.json({ error: 'Olympiad name is required.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('olympiads')
      .update({ name, url })
      .eq('id', OlympiadId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { OlympiadId } = await params;
    const { EventsError } = await supabase
      .from('event_access')
      .delete()
      .eq('olympiad_id', OlympiadId);

    if (EventsError) {
      throw EventsError;
    }
    const { OlympiadError } = await supabase
      .from('olympiads')
      .delete()
      .eq('id', OlympiadId);

    if (OlympiadError) {
      throw OlympiadError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}