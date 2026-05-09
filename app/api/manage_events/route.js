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

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

async function ensureOlympiad({ olympiadId, olympiadName, olympiadUrl }) {
  if (olympiadId) {
    return olympiadId;
  }

  const trimmedName = olympiadName?.trim();
  if (!trimmedName) {
    throw new Error('Select an olympiad or provide a new olympiad name.');
  }

  const { data: insertedOlympiad, error: insertError } = await supabase
    .from('olympiads')
    .insert({
      name: trimmedName,
      url: olympiadUrl?.trim() || null,
    })
    .select('id')
    .single();

  if (insertError) {
    throw insertError;
  }

  return insertedOlympiad.id;
}

export async function GET(req) {
  try {
    const userId = getAuthorizedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: eventAccess, error: eventsError } = await supabase
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
            olympiads (id, name, url)
          )
        `)
        .eq('user_id', userId)
        .order('event_id', { ascending: true });

    if (eventsError) {
      throw eventsError;
    }

    const events = eventAccess.map((entry) => ({
      id: entry.olympiad_events.id,
      olympiadId: entry.olympiad_events.olympiad_id,
      olympiadName: entry.olympiad_events.olympiads.name,
      olympiadUrl: entry.olympiad_events.olympiads.url,
      description: entry.olympiad_events.action,
      start: entry.olympiad_events.date_start,
      end: entry.olympiad_events.date_end,
      role: entry.role,
    }));

    const olympiadMap = new Map();
    for (const entry of eventAccess) {
      const olympiad = entry.olympiad_events.olympiads;
      if (!olympiadMap.has(olympiad.id)) {
        olympiadMap.set(olympiad.id, {
          id: olympiad.id,
          name: olympiad.name,
          url: olympiad.url,
        });
      }
    }
    const olympiads = Array.from(olympiadMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ events, olympiads });
  } catch (error) {
    console.error('Error fetching manager data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch manager data', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const userId = getAuthorizedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const description = payload.description?.trim();
    const dateStart = normalizeDate(payload.startDate);
    const dateEnd = normalizeDate(payload.endDate);

    if (!description || !dateStart || !dateEnd) {
      return NextResponse.json(
        { error: 'Description, start date, and end date are required.' },
        { status: 400 }
      );
    }

    if (new Date(dateEnd) < new Date(dateStart)) {
      return NextResponse.json(
        { error: 'End date must be on or after the start date.' },
        { status: 400 }
      );
    }

    const olympiadId = await ensureOlympiad(payload);

    const { data: event, error: eventError } = await supabase
      .from('olympiad_events')
      .insert({
        olympiad_id: olympiadId,
        action: description,
        date_start: dateStart,
        date_end: dateEnd,
      })
      .select('id')
      .single();

    if (eventError) {
      throw eventError;
    }

    const { error: accessError } = await supabase
      .from('event_access')
      .upsert({
        user_id: userId,
        event_id: event.id,
        role: 'admin',
      });

    if (accessError) {
      throw accessError;
    }

    return NextResponse.json({ success: true, eventId: event.id });
  } catch (error) {
    console.error('Error creating managed event:', error);
    return NextResponse.json(
      { error: 'Failed to create event', details: error.message },
      { status: 500 }
    );
  }
}