export const COMPLETED_OLYMPIADS_KEY = "completedOlympiadIds";

type CompletedMap = Record<string, boolean>;

function readMap(): CompletedMap {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(COMPLETED_OLYMPIADS_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map: CompletedMap) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(COMPLETED_OLYMPIADS_KEY, JSON.stringify(map));
}

export function getCompletedOlympiadMap() {
  return readMap();
}

export function isOlympiadCompleted(olympiadId: number | string) {
  const map = readMap();
  return Boolean(map[String(olympiadId)]);
}

export function setOlympiadCompleted(olympiadId: number | string, completed: boolean) {
  const map = readMap();
  const key = String(olympiadId);
  if (completed) {
    map[key] = true;
  } else {
    delete map[key];
  }
  writeMap(map);
}