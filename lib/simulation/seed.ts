/**
 * Deterministic seeded PRNG — mulberry32 algorithm.
 * Same seed → identical sequence every time. Used to make all simulated
 * cost data stable across page reloads while still varying per-account and per-date.
 */

export function createRng(seed: number) {
  let s = seed >>> 0
  return function (): number {
    s += 0x6d2b79f5
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Hash a string to a stable 32-bit seed */
export function hashSeed(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = (Math.imul(h, 0x01000193)) >>> 0
  }
  return h
}

/** Create a RNG seeded by accountId + today's date (drifts daily) */
export function dailyRng(accountId: string, offsetDays = 0): () => number {
  const d = new Date()
  d.setDate(d.getDate() - offsetDays)
  const dateStr = d.toISOString().split('T')[0]
  return createRng(hashSeed(`${accountId}:${dateStr}`))
}

/** Seeded rand in [min, max] with dp decimal places */
export function seededRand(rng: () => number, min: number, max: number, dp = 2): number {
  return parseFloat((rng() * (max - min) + min).toFixed(dp))
}

/** Pick a random item from an array using the seeded rng */
export function seededPick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

/** Date string N days ago */
export function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

/**
 * Build a 30-day cost trend using a seeded RNG.
 * Includes: weekday/weekend pattern, monthly ramp, optional anomaly spike.
 */
export function buildDailyTrend(
  accountId: string,
  dailyBase: number,
  anomalyDay?: number,  // day index (0=today, 29=30 days ago) that gets a spike
): { date: string; amountUsd: number }[] {
  const pts = []
  for (let i = 29; i >= 0; i--) {
    const rng = createRng(hashSeed(`${accountId}:trend:${i}`))
    const noise  = seededRand(rng, -0.07, 0.13)
    const dow    = new Date(daysAgo(i)).getDay()
    const weekend = dow === 0 || dow === 6 ? 0.76 : 1
    const ramp   = 1 + (29 - i) * 0.002          // slight monthly growth
    const anomaly = anomalyDay !== undefined && i === anomalyDay ? 1.45 : 1
    const amt    = dailyBase * (1 + noise) * weekend * ramp * anomaly
    pts.push({ date: daysAgo(i), amountUsd: parseFloat(amt.toFixed(2)) })
  }
  return pts
}
