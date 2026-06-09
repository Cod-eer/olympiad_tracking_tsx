import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { diff } from "util";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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
    console.log(dict);

    const name = Array.isArray(dict.name) ? dict.name[0] : dict.name;
    const dashed_name = Array.isArray(dict.dashed_name) ? dict.dashed_name[0] : dict.dashed_name;
    const url = Array.isArray(dict.url) ? dict.url[0] : dict.url;
    const billing = Array.isArray(dict.billing) ? dict.billing[0] : dict.billing;
    const difficulty = Array.isArray(dict.difficulty) ? dict.difficulty[0] : dict.difficulty;
    const requirements = Array.isArray(dict.requirements) ? dict.requirements[0] : dict.requirements;
    const organizers = Array.isArray(dict.organizers) ? dict.organizers[0] : dict.organizers;
    const rewards = Array.isArray(dict.rewards) ? dict.rewards[0] : dict.rewards;

    const { data: insertedOlympiad, error: insertError } = await supabase
      .from('verified_olympiads')
      .insert({
        name,
        fees: billing,
        requirements,
        organizers,
        rewards,
        difficulty,
        dashed_name,
        url
      })
      .select('id')
      .single();

    for (const i of dict.dates) {
      const dateStart = toTimestamp(i.dateStart);
      const dateEnd = toTimestamp(i.dateEnd);
      const action = i.description;

      // Insert event
      const { data: event, error: eventError } = await supabase
        .from('verified_events')
        .insert({
          olympiad_id: insertedOlympiad.id,
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
    }

    if (insertError) throw insertError;

    return NextResponse.json({ success: 'Shared an olympiad!', id: insertedOlympiad.id });
  } catch (error) {
    console.error('Failed to share olympiad:', error);
    return NextResponse.json(
      { error: 'Failed to share olympiad', details: error.message },
      { status: 500 }
    );
  }
}
