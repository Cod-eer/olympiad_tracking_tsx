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

    const { data: olympiads, error: error } = await supabase
        .from('verified_olympiads')
        .select(`id, name, fees, requirements, organizers, rewards, difficulty, url`)
        .order('difficulty', { ascending: true });

    if (error) {
        throw error;
    }

    return NextResponse.json(olympiads);
}