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

async function getAllTrackedUserIds() {
  const { data, error } = await supabase
    .from('event_access')
    .select('user_id');

  if (error) {
    throw error;
  }

  return Array.from(new Set((data ?? []).map((row) => row.user_id).filter(Boolean)));
}

function buildReminder(events, reminderDays) {
  const eventWord = events.length === 1 ? 'event' : 'events';
  const dayLabel = reminderDays.join(' & ');
  const subject = `Reminder: ${events.length} upcoming ${eventWord} (${dayLabel} day notice)`;

  const textLines = [
    subject,
    '',
    ...events.map((event) => (
      `- ${event.name}: ${event.action} due ${formatBriefingDate(event.deadline)} (${event.deadlineStatus})`
    )),
  ];

  const itemsHtml = events.map((event) => `
    <li style="margin:0 0 14px;padding:12px;border-left:4px solid ${event.borderColor};background:${event.backgroundColor};color:${event.textColor};">
      <strong>${escapeHtml(event.name)}</strong>
      <div>${escapeHtml(event.action)}</div>
      <div style="font-size:13px;margin-top:4px;">
        ${escapeHtml(formatBriefingDate(event.deadline))} - ${escapeHtml(event.deadlineStatus)}
      </div>
    </li>
  `).join('');

  return {
    subject,
    text: textLines.join('\n'),
    html: `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;">
            <h1 style="font-size:22px;margin:0 0 8px;">${escapeHtml(subject)}</h1>
            <ul style="list-style:none;margin:0;padding:0;">${itemsHtml}</ul>
          </div>`,
  };
}

function buildBriefing(events, lookaheadDays) {
  const windowLabel = getWindowLabel(lookaheadDays);
  const deadlineWord = events.length === 1 ? 'deadline' : 'deadlines';
  const uniqueNames = Array.from(new Set(events.map((event) => event.name).filter(Boolean)));
  const namesPreview = uniqueNames.slice(0, 3).join(', ');
  const title = `${events.length} ${deadlineWord} ${windowLabel}`;
  const subject = namesPreview ? `${title}: ${namesPreview}` : title;

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
      <ul style="list-style:none;margin:0;padding:0;">${itemsHtml}</ul>
    </div>
  `;

  return {
    title,
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
      subject: briefing.title,
      text: briefing.text,
      html: briefing.html,
    });

    for (const event of events) {
      await supabase.from('email_logs').insert({
        user_id: userId,
        event_id: event.id,
        reminder_day: lookaheadDays,
        type: 'requested_briefing',
        sent_at: new Date().toISOString(),
        text: briefing.text
      });
    }
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
      { error: 'Failed to send deadline briefing',
        details: error.message
      },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reminderDays = [3, 7];
    const mode = new URL(req.url).searchParams.get('mode') ?? 'all';
    const sendWeekly = mode === 'all' || mode === 'weekly';
    const sendReminder = mode === 'all' || mode === 'reminder';

    const users = await getAllTrackedUserIds();
    const summary = { users: users.length, mode, weeklySent: 0, reminderSent: 0, errors: 0 };

    for (const userId of users) {
      try {
        const email = await getCurrentUserEmail(userId);
        const weeklyEvents = await getDeadlineEventsForUser(userId, 7);
        const reminderEvents = weeklyEvents.filter((event) => reminderDays.includes(Math.ceil(event.daysToDeadline)));

        if (!email) {
          continue;
        }

        if (sendWeekly && weeklyEvents.length > 0) {
          const briefing = buildBriefing(weeklyEvents, 7);
          await sendResendEmail({ to: email, ...briefing });
          for (const event of weeklyEvents) {
            await supabase.from('email_logs').insert({
              user_id: userId,
              event_id: event.id,
              reminder_day: 7,
              type: 'weekly_reminder',
              sent_at: new Date().toISOString(),
              text: briefing.text
            });
          }
          summary.weeklySent += 1;
        }

        if (sendReminder && reminderEvents.length > 0) {
          const reminder = buildReminder(reminderEvents, reminderDays);
          await sendResendEmail({ to: email, ...reminder });
          for (const event of weeklyEvents) {
            await supabase.from('email_logs').insert({
              user_id: userId,
              event_id: event.id,
              reminder_day: 37,
              type: 'deadline_reminder',
              sent_at: new Date().toISOString(),
              text: briefing.text
            });
          }
          summary.reminderSent += 1;
        }
      } catch (error) {
        summary.errors += 1;
        console.error(`Failed deadline emails for user ${userId}:`, error);
      }
    }

    return NextResponse.json({ success: true, ...summary });
  } catch (error) {
    console.error('Error running deadline briefing cron:', error);
    return NextResponse.json({ error: 'Failed to run deadline briefing cron', details: error.message }, { status: 500 });
  }
}