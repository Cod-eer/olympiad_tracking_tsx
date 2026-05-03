import { NextResponse } from 'next/server';
import { clerkClient, getAuth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { addDeadlineUrgency, isUpcomingDeadline, sortByDeadlineUrgency } from '../../../lib/deadlines.js';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const emailDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function normalizeLookaheadDays(value) {
  const days = Number(value ?? process.env.DEADLINE_BRIEFING_LOOKAHEAD_DAYS ?? 7);

  if (!Number.isFinite(days)) {
    return 7;
  }

  return Math.min(Math.max(Math.trunc(days), 1), 30);
}

async function readRequestJson(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatBriefingDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return emailDateFormatter.format(date);
}

function getWindowLabel(lookaheadDays) {
  return lookaheadDays === 7 ? 'this week' : `in the next ${lookaheadDays} days`;
}

function getPrimaryEmail(user) {
  const primaryEmail = user.emailAddresses?.find((email) => email.id === user.primaryEmailAddressId);
  return primaryEmail?.emailAddress ?? user.emailAddresses?.[0]?.emailAddress ?? null;
}

async function getCurrentUserEmail(userId) {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  return getPrimaryEmail(user);
}

async function getDeadlineEventsForUser(userId, lookaheadDays) {
  const { data: eventsData, error } = await supabase
    .from('event_access')
    .select(`
      event_id,
      olympiad_events (
        id,
        olympiad_id,
        action,
        date_start,
        date_end,
        olympiads (name, url)
      )
    `)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  return (eventsData ?? [])
    .map((row) => row.olympiad_events)
    .filter(Boolean)
    .map((event) => addDeadlineUrgency({
      id: event.id,
      olympiad_id: event.olympiad_id,
      name: event.olympiads?.name ?? 'Olympiad',
      url: event.olympiads?.url ?? null,
      action: event.action,
      start: event.date_start,
      end: event.date_end,
    }))
    .filter((event) => isUpcomingDeadline(event) && event.daysToDeadline <= lookaheadDays)
    .sort(sortByDeadlineUrgency);
}

function buildBriefing(events, lookaheadDays) {
  const windowLabel = getWindowLabel(lookaheadDays);
  const deadlineWord = events.length === 1 ? 'deadline' : 'deadlines';
  const uniqueNames = Array.from(new Set(events.map((event) => event.name).filter(Boolean)));
  const namesPreview = uniqueNames.slice(0, 3).join(', ');
  const subject = namesPreview
    ? `${events.length} ${deadlineWord} ${windowLabel}: ${namesPreview}`
    : `${events.length} ${deadlineWord} ${windowLabel}`;

  const textLines = [
    subject,
    '',
    ...events.map((event) => (
      `- [${event.urgencyLabel}] ${event.name}: ${event.action} due ${formatBriefingDate(event.deadline)} (${event.deadlineStatus}, urgency ${event.urgency.toFixed(2)})`
    )),
  ];

  const itemsHtml = events.map((event) => `
    <li style="margin:0 0 14px;padding:12px;border-left:4px solid ${event.borderColor};background:${event.backgroundColor};color:${event.textColor};">
      <strong>${escapeHtml(event.name)}</strong>
      <div>${escapeHtml(event.action)}</div>
      <div style="font-size:13px;margin-top:4px;">
        ${escapeHtml(formatBriefingDate(event.deadline))} - ${escapeHtml(event.deadlineStatus)} - urgency ${escapeHtml(event.urgency.toFixed(2))}
      </div>
    </li>
  `).join('');

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;">
      <h1 style="font-size:22px;margin:0 0 8px;">${escapeHtml(subject)}</h1>
      <p style="margin:0 0 18px;color:#475569;">Urgency uses 1 / (days_to_deadline + 1), with red for critical deadlines under 3 days and yellow for deadlines under 10 days.</p>
      <ul style="list-style:none;margin:0;padding:0;">${itemsHtml}</ul>
    </div>
  `;

  return {
    subject,
    text: textLines.join('\n'),
    html,
  };
}

async function sendResendEmail({ to, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.DEADLINE_EMAIL_FROM;

  if (!apiKey || !from) {
    const missing = [
      !apiKey ? 'RESEND_API_KEY' : null,
      !from ? 'DEADLINE_EMAIL_FROM' : null,
    ].filter(Boolean).join(', ');

    throw new Error(`Deadline email is not configured. Missing: ${missing}`);
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
      html,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || `Resend request failed with ${response.status}`);
  }

  return data;
}

export async function POST(req) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await readRequestJson(req);
    const lookaheadDays = normalizeLookaheadDays(payload.lookaheadDays);
    const [email, events] = await Promise.all([
      getCurrentUserEmail(userId),
      getDeadlineEventsForUser(userId, lookaheadDays),
    ]);

    if (!email) {
      return NextResponse.json(
        { error: 'No email address is available for this user.' },
        { status: 400 }
      );
    }

    if (events.length === 0) {
      return NextResponse.json({
        success: true,
        sent: false,
        count: 0,
        message: `No deadlines ${getWindowLabel(lookaheadDays)}.`,
      });
    }

    const briefing = buildBriefing(events, lookaheadDays);
    const result = await sendResendEmail({
      to: email,
      ...briefing,
    });

    return NextResponse.json({
      success: true,
      sent: true,
      count: events.length,
      to: email,
      resendId: result.id,
    });
  } catch (error) {
    console.error('Error sending deadline briefing:', error);
    return NextResponse.json(
      { error: 'Failed to send deadline briefing', details: error.message },
      { status: 500 }
    );
  }
}
