import { NextResponse } from 'next/server';
import { getAuth } from "@clerk/nextjs/server";
import { createClient } from '@supabase/supabase-js';
import { use } from 'react';


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Convert date from dd-mm-yyyy to yyyy-mm-dd
const toTimestamp = (date) => {
  const [dd, mm, yyyy] = date.split('-');
  return `${yyyy}-${mm}-${dd}`;
};

export async function POST(req) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { dict } = await req.json();

    // Fix arrays → strings
    const name = Array.isArray(dict.name) ? dict.name[0] : dict.name;
    const url = Array.isArray(dict.url) ? dict.url[0] : dict.url;
    const billing = Array.isArray(dict.billing) ? dict.billing : [dict.billing];
    const requirements = Array.isArray(dict.requirements) ? dict.requirements : [dict.requirements];
    const organizers = Array.isArray(dict.organizers) ? dict.organizers : [dict.organizers];
    const rewards = Array.isArray(dict.rewards) ? dict.rewards : [dict.rewards];

    const { data: insertedOlympiad, error: insertError } = await supabase
      .from('olympiads')
      .insert({
        name,
        fees: billing,
        requirements,
        organizers,
        rewards,
        url
      })
      .select('id')
      .single();

    if (insertError) throw insertError;
    const olympiadId = insertedOlympiad.id;

    // Insert events
    for (const i of dict.dates) {
      const dateStart = toTimestamp(i.dateStart);
      const dateEnd = toTimestamp(i.dateEnd);
      const action = i.description;

      // Insert event
      const { data: event, error: eventError } = await supabase
        .from('olympiad_events')
        .insert({
          olympiad_id: olympiadId,
          action,
          date_start: dateStart,
          date_end: dateEnd
        })
        .select('id')
        .single();

      if (eventError) {
        if (eventError.code === '23505') continue; // unique violation → skip
        throw eventError;
      }

      // Give user admin access
      await supabase
        .from('event_access')
        .upsert({
          user_id: userId,
          event_id: event.id,
          role: (userId === process.env.BASE_USER_ID) ? 'admin' : 'viewer'
        });
    }

    return NextResponse.json({ success: 'Event added successfully' });
  } catch (error) {
    console.error('Failed to add event:', error);
    return NextResponse.json(
      { error: 'Failed to add event', details: error.message },
      { status: 500 }
    );
  }
}
