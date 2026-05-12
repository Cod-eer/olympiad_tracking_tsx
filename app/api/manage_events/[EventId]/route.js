import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function getAuthorizedUserId(req) {
  const { userId } = getAuth(req);
  return userId ?? null;
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

export async function PUT(req, { params }) {
  try {
    //console.log(params);
    const data = await params;
    const eventId = Number(data.EventId);
    console.log('Parsed eventId:', eventId);
    if (!Number.isInteger(eventId)) {
      return NextResponse.json({ error: 'Invalid event id.' }, { status: 400 });
    }

    const payload = await req.json();
    const description = payload.description?.trim();
    const dateStart = normalizeDate(payload.startDate);
    const dateEnd = normalizeDate(payload.endDate);

    if (typeof payload?.completed === 'boolean') {
      const { data: accessRows, error: accessError } = await supabase
        .from('event_access')
        .select('event_id')
        .eq('user_id', getAuthorizedUserId(req));
      if (accessError) throw accessError;
      const eventIds = (accessRows ?? []).map((row) => row.event_id);
      const { error: completedError } = await supabase
        .from('olympiad_events')
        .update({ completed: payload.completed })
        .eq('id', eventId)
        .in('id', eventIds);
      if (completedError) throw completedError;
      return NextResponse.json({ success: true });
    }

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

    const { error } = await supabase
      .from('olympiad_events')
      .update({
        olympiad_id: olympiadId,
        action: description,
        date_start: dateStart,
        date_end: dateEnd,
      })
      .eq('id', eventId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating managed event:', error);
    return NextResponse.json(
      { error: 'Failed to update event', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    //console.log(params);
    const eventId = Number(params.EventId);
    if (!Number.isInteger(eventId)) {
      return NextResponse.json({ error: 'Invalid event id.' }, { status: 400 });
    }
    const { error: accessDeleteError } = await supabase
      .from('event_access')
      .delete()
      .eq('event_id', eventId);

    if (accessDeleteError) {
      throw accessDeleteError;
    }

    const { error: eventDeleteError } = await supabase
      .from('olympiad_events')
      .delete()
      .eq('id', eventId);

    if (eventDeleteError) {
      throw eventDeleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting managed event:', error);
    return NextResponse.json(
      { error: 'Failed to delete event', details: error.message },
      { status: 500 }
    );
  }
}