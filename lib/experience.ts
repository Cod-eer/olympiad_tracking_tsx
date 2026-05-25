export type ProgressCounts = {
  totalOlympiads: number;
  completedOlympiads: number;
  totalEvents: number;
  completedEvents: number;
  missedEvents: number;
};

const EXPERIENCE_WEIGHTS = {
  olympiadAdded: 40,
  olympiadCompleted: 120,
  eventAdded: 12,
  eventCompleted: 30,
} as const;

export function calculateExperience(counts: ProgressCounts) {
  const experience =
    counts.totalOlympiads * EXPERIENCE_WEIGHTS.olympiadAdded +
    counts.completedOlympiads * EXPERIENCE_WEIGHTS.olympiadCompleted +
    counts.totalEvents * EXPERIENCE_WEIGHTS.eventAdded +
    counts.completedEvents * EXPERIENCE_WEIGHTS.eventCompleted;

  const level = Math.floor(Math.sqrt(experience / 100)) + 1;
  const currentLevelBase = Math.pow(level - 1, 2) * 100;
  const nextLevelBase = Math.pow(level, 2) * 100;
  const xpIntoLevel = experience - currentLevelBase;
  const xpForNextLevel = nextLevelBase - currentLevelBase;

  return {
    experience,
    level,
    xpIntoLevel,
    xpForNextLevel,
    weights: EXPERIENCE_WEIGHTS,
  };
}