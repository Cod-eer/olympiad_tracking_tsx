import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function getAuthorizedUserId(req) {
  const { userId } = getAuth(req);
  return userId ?? null;
}

export async function PUT(req) {
    const userId = getAuthorizedUserId(req);
    if (!userId) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { name } = await req.json();
    const res = name.split(' ').join('-').toLowerCase();
    return NextResponse.json({ name: res });
}

export async function POST(req) {
    const userId = getAuthorizedUserId(req);
    if (!userId) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { dashedName } = await req.json();
    const { data, error } = await supabase
        .from('olympiads')
        .select('id')
        .eq('dashed_name', dashedName)
        .single();

    if (error) {
        console.error("Error retrieving ID:", error);
        return NextResponse.json({ error: "Failed to retrieve ID", details: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
}