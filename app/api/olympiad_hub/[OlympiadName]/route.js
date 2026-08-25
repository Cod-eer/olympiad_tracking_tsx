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
      .select('id, action, date_start, date_end')
      .eq('olympiad_id', olympiad.id);

    if (eventsError) {
      throw eventsError;
    }

    const events = eventsData.map((event) => ({
      id: event.id,
      action: event.action,
      start: event.date_start,
      end: event.date_end,
    }));
    console.log(events);
    return NextResponse.json({ olympiad : olympiad, events: events });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function normalize(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (Array.isArray(value)) {
    return value
      .map(normalize)
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  return value;
}

function isExactMatch(local, verified) {
  return (
    JSON.stringify(normalize(local.name)) === JSON.stringify(normalize(verified.name)) &&
    JSON.stringify(normalize(local.url)) === JSON.stringify(normalize(verified.url)) &&
    JSON.stringify(normalize(local.organizers)) === JSON.stringify(normalize(verified.organizers)) &&
    JSON.stringify(normalize(local.fees)) === JSON.stringify(normalize(verified.fees)) &&
    JSON.stringify(normalize(local.rewards)) === JSON.stringify(normalize(verified.rewards)) &&
    JSON.stringify(normalize(local.requirements)) === JSON.stringify(normalize(verified.requirements))
  );
}

export async function PUT(req, { params }) {
  try {
    const { OlympiadName } = await params;
    console.log("Received PUT request for Olympiad:", OlympiadName);
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

    const { data: eventsData, error: eventsError } = await supabase
      .from('verified_events')
      .select('id, action, date_start, date_end')
      .eq('olympiad_id', verifiedOlympiad.id);

    console.log(eventsData);

    if (eventsError) {
      throw eventsError;
    }

    const verifiedOlympiad = olympiadData[0];
    const { data: localOlympiads, error: localError } = await supabase
      .from('olympiads')
      .select('id, name, url, organizers, fees, rewards, requirements')
      .eq('name', verifiedOlympiad.name);

    if (localError) {
      throw localError;
    }
    const existingOlympiad = localOlympiads?.find(
      (local) => isExactMatch(local, verifiedOlympiad)
    );
    let localOlympiadId;
    if (existingOlympiad) {
      localOlympiadId = existingOlympiad.id;
    } else {
      const { data: insertedOlympiad, error: insertError } = await supabase
        .from('olympiads')
        .insert({
          name: verifiedOlympiad.name,
          url: verifiedOlympiad.url,
          organizers: verifiedOlympiad.organizers,
          fees: verifiedOlympiad.fees,
          rewards: verifiedOlympiad.rewards,
          requirements: verifiedOlympiad.requirements,
        })
        .select('id')
        .single();
      if (insertError) {
        throw insertError;
      }
      localOlympiadId = insertedOlympiad.id;
    }

    for (const i of eventsData) {
      const { data: eventData, error: eventError } = await supabase
      .from('olympiad_events')
      .insert({
        olympiad_id: localOlympiadId,
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
        event_id: eventData.id,
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