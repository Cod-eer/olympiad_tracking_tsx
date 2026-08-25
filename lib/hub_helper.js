export function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => item !== null && item !== undefined && String(item).trim() !== '');
  }

  if (value === null || value === undefined || value === '') {
    return [];
  }

  return [value];
}

export function normalizeDifficulty(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

async function fetchAllRows(buildQuery, pageSize = 1000) {
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) {
      throw error;
    }

    rows.push(...(data ?? []));

    if (!data || data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return rows;
}

export async function getTrackingCountsByUrls(supabase, urls) {
  const validUrls = [...new Set((urls ?? []).filter(Boolean))];
  if (validUrls.length === 0) {
    return new Map();
  }

  const { data: trackedOlympiads, error: olympiadsError } = await supabase
    .from('verified_olympiads')
    .select('id, url')
    .in('url', validUrls);

  if (olympiadsError) {
    throw olympiadsError;
  }

  const olympiadRows = trackedOlympiads ?? [];
  if (olympiadRows.length === 0) {
    return new Map(validUrls.map((url) => [url, 0]));
  }

  const olympiadIdToUrl = new Map(olympiadRows.map((row) => [row.id, row.url]));
  const eventRows = await fetchAllRows(() =>
    supabase
      .from('olympiad_events')
      .select('id, olympiad_id')
      .in('olympiad_id', [...olympiadIdToUrl.keys()])
  );

  const eventIdToUrl = new Map(
    eventRows.map((row) => [row.id, olympiadIdToUrl.get(row.olympiad_id)])
  );
  if (eventIdToUrl.size === 0) {
    return new Map(validUrls.map((url) => [url, 0]));
  }

  const accessRows = await fetchAllRows(() =>
    supabase
      .from('event_access')
      .select('event_id, user_id')
      .in('event_id', [...eventIdToUrl.keys()])
  );

  const trackersByUrl = new Map(validUrls.map((url) => [url, new Set()]));
  for (const row of accessRows) {
    const url = eventIdToUrl.get(row.event_id);
    if (url && row.user_id) {
      trackersByUrl.get(url)?.add(row.user_id);
    }
  }

  return new Map([...trackersByUrl.entries()].map(([url, users]) => [url, users.size]));
}