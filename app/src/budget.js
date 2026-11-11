// NoteVault Hybrid — budget meter (12 Nov 2026).
// Counts CLOUD calls per day against the Gemini free tier. On-device calls
// cost nothing and are counted separately. The meter counts CALLS, not
// tokens — on-device token counting always throws per the docs, and the
// cloud token count is not wired until the real SDK lands.
//
// ⚠️ PLACEHOLDER NUMBERS: the daily budget below is NOT verified. The cited
// figures conflict (250 vs 1,500 requests/day for gemini-2.5-flash-lite),
// so the meter uses 250 and labels it UNVERIFIED until the Day 1 spike
// (9 Nov) reads the real limit from AI Studio. Never quote the meter as
// the real free-tier limit. NOTE (12 Nov 2026): the cloud model is now
// gemini-3.5-flash-lite — gemini-2.5-flash-lite is being retired and its
// requests route to 3.5-flash-lite from 1 Dec 2026 (official supported-
// models page). Read the 3.5-flash-lite free-tier RPD from AI Studio at
// deploy time and update PLACEHOLDER_DAILY_BUDGET + BUDGET_VERIFIED here.
export const BUDGET_VERIFIED = false;
export const PLACEHOLDER_DAILY_BUDGET = 250;

const STORAGE_KEY = "nv-hybrid-budget-v1";

// localStorage is unavailable in some contexts (node tests, private mode);
// fall back to an in-memory store so the meter never throws.
const memoryStore = new Map();
const storage = (() => {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    // fall through to memory
  }
  return {
    getItem: (k) => (memoryStore.has(k) ? memoryStore.get(k) : null),
    setItem: (k, v) => memoryStore.set(k, String(v)),
    removeItem: (k) => memoryStore.delete(k),
  };
})();

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function load() {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { date: todayKey(), cloudUsed: 0, onDeviceUsed: 0 };
    const parsed = JSON.parse(raw);
    if (parsed.date !== todayKey()) {
      return { date: todayKey(), cloudUsed: 0, onDeviceUsed: 0 };
    }
    return {
      date: parsed.date,
      cloudUsed: Number(parsed.cloudUsed) || 0,
      onDeviceUsed: Number(parsed.onDeviceUsed) || 0,
    };
  } catch {
    return { date: todayKey(), cloudUsed: 0, onDeviceUsed: 0 };
  }
}

function save(state) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Meter state is best-effort; a failed save must not break the app.
  }
}

export function recordCall(inferenceSource) {
  const state = load();
  if (inferenceSource === "IN_CLOUD") state.cloudUsed += 1;
  else state.onDeviceUsed += 1;
  save(state);
  return getBudget();
}

export function getBudget() {
  const state = load();
  return {
    date: state.date,
    cloudUsed: state.cloudUsed,
    onDeviceUsed: state.onDeviceUsed,
    dailyBudget: PLACEHOLDER_DAILY_BUDGET,
    cloudRemaining: Math.max(0, PLACEHOLDER_DAILY_BUDGET - state.cloudUsed),
    verified: BUDGET_VERIFIED,
  };
}

export function resetBudget() {
  const state = { date: todayKey(), cloudUsed: 0, onDeviceUsed: 0 };
  save(state);
  return getBudget();
}
