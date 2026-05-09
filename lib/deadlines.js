const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const URGENCY_LEVELS = {
  OVERDUE: "overdue",
  CRITICAL: "critical",
  SOON: "soon",
  NORMAL: "normal",
  UNKNOWN: "unknown",
};

export const URGENCY_EVENT_COLORS = {
  [URGENCY_LEVELS.OVERDUE]: {
    backgroundColor: "#fee2e2",
    borderColor: "#dc2626",
    textColor: "#7f1d1d",
  },
  [URGENCY_LEVELS.CRITICAL]: {
    backgroundColor: "#fee2e2",
    borderColor: "#ef4444",
    textColor: "#7f1d1d",
  },
  [URGENCY_LEVELS.SOON]: {
    backgroundColor: "#fef3c7",
    borderColor: "#f59e0b",
    textColor: "#78350f",
  },
  [URGENCY_LEVELS.NORMAL]: {
    backgroundColor: "#eef2ff",
    borderColor: "#4f46e5",
    textColor: "#312e81",
  },
  [URGENCY_LEVELS.UNKNOWN]: {
    backgroundColor: "#f1f5f9",
    borderColor: "#94a3b8",
    textColor: "#334155",
  },
};

function startOfUtcDay(date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function getDeadlineDate(event) {
  return event?.start ?? null;
}

export function formatDeadlineStatus(daysToDeadline) {
  if (daysToDeadline === null || daysToDeadline === undefined) {
    return "No deadline";
  }

  if (daysToDeadline < 0) {
    const daysOverdue = Math.abs(daysToDeadline);
    return daysOverdue === 1 ? "1 day overdue" : `${daysOverdue} days overdue`;
  }

  if (daysToDeadline === 0) {
    return "Due today";
  }

  if (daysToDeadline === 1) {
    return "1 day left";
  }

  return `${daysToDeadline} days left`;
}

export function calculateDeadlineUrgency(deadlineValue, now = new Date()) {
  if (!deadlineValue) {
    return {
      deadline: null,
      daysToDeadline: null,
      urgency: 0,
      urgencyLevel: URGENCY_LEVELS.UNKNOWN,
      urgencyLabel: "No deadline",
      deadlineStatus: "No deadline",
    };
  }

  const deadlineDate = new Date(deadlineValue);
  if (Number.isNaN(deadlineDate.getTime())) {
    return {
      deadline: deadlineValue,
      daysToDeadline: null,
      urgency: 0,
      urgencyLevel: URGENCY_LEVELS.UNKNOWN,
      urgencyLabel: "Invalid deadline",
      deadlineStatus: "Invalid deadline",
    };
  }

  const daysToDeadline = Math.ceil((startOfUtcDay(deadlineDate) - startOfUtcDay(now)) / DAY_IN_MS);
  const urgency = daysToDeadline >= 0 ? 1 / (daysToDeadline + 1) : 1;
  let urgencyLevel = URGENCY_LEVELS.NORMAL;

  if (daysToDeadline < 0) {
    urgencyLevel = URGENCY_LEVELS.OVERDUE;
  } else if (daysToDeadline < 3) {
    urgencyLevel = URGENCY_LEVELS.CRITICAL;
  } else if (daysToDeadline < 15) {
    urgencyLevel = URGENCY_LEVELS.SOON;
  }

  return {
    deadline: deadlineDate.toISOString(),
    daysToDeadline,
    urgency: Number(urgency.toFixed(4)),
    urgencyLevel,
    urgencyLabel: urgencyLevel[0].toUpperCase() + urgencyLevel.slice(1),
    deadlineStatus: formatDeadlineStatus(daysToDeadline),
  };
}

export function addDeadlineUrgency(event, now = new Date()) {
  const urgency = calculateDeadlineUrgency(getDeadlineDate(event), now);
  const colors = URGENCY_EVENT_COLORS[urgency.urgencyLevel] ?? URGENCY_EVENT_COLORS[URGENCY_LEVELS.UNKNOWN];

  return {
    ...event,
    ...urgency,
    ...colors,
  };
}

export function sortByDeadlineUrgency(first, second) {
  const firstDays = first.daysToDeadline ?? Number.POSITIVE_INFINITY;
  const secondDays = second.daysToDeadline ?? Number.POSITIVE_INFINITY;

  if (firstDays !== secondDays) {
    return firstDays - secondDays;
  }

  return (second.urgency ?? 0) - (first.urgency ?? 0);
}

export function isUpcomingDeadline(event) {
  return event.daysToDeadline !== null && event.daysToDeadline >= 0;
}
