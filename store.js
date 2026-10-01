// State + weekly re-plan logic. No DOM in here, so it can be tested in Node.
import { schedule, weeklyAdjust, milestoneBoosts, describe, dayInfo, addDays, mondayOf, dow, checkStartOf, checkEndOf } from "./planner/scheduler.js";
import { PLAN_START, PLAN_END, DSA_STEPS, TASKS } from "./planner/plan-data.js";

export const KEY = "prepplanner.v1";
export const STEP_HRS = Object.fromEntries(DSA_STEPS.map((s) => [s.key, s.hrs]));

// The app's day runs 4 am → 4 am IST, so late-night work still counts for the day you're on.
export const DAY_START_HOUR = 4;
export const todayIST = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(now.getTime() - DAY_START_HOUR * 36e5)); // YYYY-MM-DD
export const hourIST = (now = new Date()) =>
  +new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hourCycle: "h23" }).format(now);

export function freshState() {
  return {
    v: 1,
    startDate: null, // first day the app was opened (clamped to plan start)
    tasks: {}, // task id -> hours done
    dsaDone: {}, // step key -> problems done beyond the Sept-29 baseline
    fixedDone: 0, // hours of fixed Sunday items ticked
    sheet: null, // last Striver sync {at, overall, steps}
    blocked: {}, // date -> label (hackathon, sick day…)
    checked: {}, // date -> { itemIndex: true }
    frozen: {}, // date -> { items: [...] }  (today's list is fixed once opened)
    weeks: {}, // monday -> { multiplier, boosts, deficit, rescope, ... }
    credit: {}, // hours banked per track between days (so small shares add up)
    ahead: {}, // date -> [{ id, track, text, hours, planned }] future items done early on that date
    syncDays: {}, // date -> true when a Striver sync showed new problems solved (counts for the streak)
    dsaLog: {}, // date -> { stepKey: [sheet problem numbers newly solved that day] } (from syncs)
  };
}

export function loadState(storage = globalThis.localStorage) {
  try {
    const raw = storage && storage.getItem(KEY);
    if (raw) return { ...freshState(), ...JSON.parse(raw) };
  } catch (e) { /* private mode / corrupt → start fresh */ }
  return freshState();
}
export function saveState(state, storage = globalThis.localStorage) {
  try { storage && storage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

export const progressOf = (state) => ({ tasks: state.tasks, dsaDone: state.dsaDone });
export const copyProgress = (p) => ({ tasks: { ...p.tasks }, dsaDone: { ...p.dsaDone } });

// Total "plan hours" of work done so far (same units the planner budgets in).
export function workDone(state) {
  const t = Object.values(state.tasks).reduce((a, b) => a + b, 0);
  const d = Object.entries(state.dsaDone).reduce((a, [k, n]) => a + n * (STEP_HRS[k] || 0), 0);
  return t + d + state.fixedDone;
}

// Hours we actually planned for past days (what was on the checklist); days never opened count at ~92% of capacity.
function plannedBetween(from, to, state) {
  let h = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const info = dayInfo(d);
    if (info.kind !== "study" || state.blocked[d]) continue;
    h += state.frozen[d] ? state.frozen[d].planned : info.hours * 0.92;
  }
  return h;
}

function capacity(from, to, state) {
  let h = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const info = dayInfo(d);
    if (info.kind === "study" && !state.blocked[d]) h += info.hours;
  }
  return h;
}

export const multipliersOf = (state) => Object.fromEntries(Object.entries(state.weeks).map(([m, w]) => [m, w.multiplier]));
export function currentBoosts(state, today) {
  const w = state.weeks[checkStartOf(today)];
  return (w && w.boosts) || {};
}

const planOpts = (state, today, extra = {}) => ({
  progress: progressOf(state),
  initialCredit: state.credit,
  multipliers: multipliersOf(state),
  boosts: currentBoosts(state, today),
  extraBlocks: state.blocked,
  ...extra,
});

// ---- re-plan check: runs twice a week (Mon, Thu), from real progress ----
// state.weeks is keyed by the check's start date (a Monday or a Thursday).
export function ensureWeek(state, today, { force = false } = {}) {
  if (today < PLAN_START || today > PLAN_END) return null;
  const start = checkStartOf(today);
  if (start < PLAN_START) return null; // exam days before the first window
  if (state.weeks[start] && !force) return state.weeks[start];
  const end = checkEndOf(start);
  const nextWeekBase = capacity(start, end, state);
  if (!nextWeekBase && !state.weeks[start]) return null; // nothing to plan in this window (exams, breaks)
  if (!state.startDate) state.startDate = today > PLAN_START ? today : PLAN_START;
  const from = state.startDate;
  const plannedToDate = start > from ? plannedBetween(from, addDays(start, -1), state) : 0;
  const doneToDate = workDone(state);
  const weekBase = Math.max(nextWeekBase, capacity(start, addDays(start, 6), state));
  const adj = weeklyAdjust({ plannedToDate, doneToDate, nextWeekBase, weekBase });
  const mult = adj.multiplier || 1;
  const boosts = milestoneBoosts(
    schedule({ progress: progressOf(state), from: start, multipliers: { ...multipliersOf(state), [start]: mult }, extraBlocks: state.blocked }).milestones,
    start,
  );
  state.weeks[start] = {
    multiplier: mult, extraHours: adj.extra || 0, deficit: adj.deficit || 0, ahead: adj.ahead || 0,
    rescope: !!adj.rescope, boosts, plannedToDate, doneToDate, at: today, end,
  };
  return state.weeks[start];
}

// ---- today's list: computed once per day from live progress, then fixed ----
export function ensureDay(state, today) {
  const info = dayInfo(today);
  if (today < PLAN_START || today > PLAN_END || info.kind !== "study" || state.blocked[today]) return null;
  if (state.frozen[today]) return state.frozen[today];
  const res = schedule(planOpts(state, today, { from: today, to: today }));
  const day = res.days[0];
  state.frozen[today] = { items: day.items.map(freezeItem), planned: day.planned, phase: info.phase && info.phase.name };
  state.credit = res.credit;
  return state.frozen[today];
}

export function freezeItem(it) {
  const kind = it.fixed ? "fixed" : it.track === "dsa" ? "dsa" : "task";
  return { kind, track: it.track, text: describe(it), hours: it.hours, id: it.id || null, step: it.step || null, count: it.count || 0, stretch: !!it.stretch, from: it.from || null, to: it.to || null };
}

export function toggleItem(state, date, idx) {
  const fr = state.frozen[date];
  if (!fr || !fr.items[idx]) return false;
  const it = fr.items[idx];
  const chk = (state.checked[date] = state.checked[date] || {});
  const sign = chk[idx] ? -1 : 1;
  if (it.kind === "task") state.tasks[it.id] = Math.max(0, (state.tasks[it.id] || 0) + sign * it.hours);
  else if (it.kind === "dsa") state.dsaDone[it.step] = Math.max(0, (state.dsaDone[it.step] || 0) + sign * it.count);
  else state.fixedDone = Math.max(0, state.fixedDone + sign * it.hours);
  if (sign > 0) chk[idx] = true; else delete chk[idx];
  return true;
}

// ---- work ahead: tick a future (projected) item today ----
// Only non-DSA, non-fixed items: DSA is counted by the Striver sync.
export const canTickAhead = (it) => !!(it && it.id && !it.fixed && it.track !== "dsa");

export function tickAhead(state, today, item, plannedFor) {
  if (!canTickAhead(item)) return false;
  (state.ahead[today] = state.ahead[today] || []).push({ id: item.id, track: item.track, text: describe(item), hours: item.hours, planned: plannedFor || null });
  state.tasks[item.id] = (state.tasks[item.id] || 0) + item.hours;
  return true;
}

export function untickAhead(state, date, idx) {
  const list = state.ahead[date];
  if (!list || !list[idx]) return false;
  const it = list[idx];
  state.tasks[it.id] = Math.max(0, (state.tasks[it.id] || 0) - it.hours);
  list.splice(idx, 1);
  if (!list.length) delete state.ahead[date];
  return true;
}

export function dayProgress(state, date) {
  const fr = state.frozen[date];
  if (!fr) return null;
  const chk = state.checked[date] || {};
  let done = 0;
  fr.items.forEach((it, i) => { if (chk[i]) done += it.hours; });
  return { planned: fr.items.reduce((a, i) => a + i.hours, 0), done, doneCount: Object.keys(chk).length, count: fr.items.length };
}

// ---- projection for the planner / milestones ----
// Assumes today's unticked items get done, then plans tomorrow onward.
export function project(state, today) {
  const p = copyProgress(progressOf(state));
  const fr = state.frozen[today];
  if (fr) {
    const chk = state.checked[today] || {};
    fr.items.forEach((it, i) => {
      if (chk[i]) return;
      if (it.kind === "task") p.tasks[it.id] = (p.tasks[it.id] || 0) + it.hours;
      else if (it.kind === "dsa") p.dsaDone[it.step] = (p.dsaDone[it.step] || 0) + it.count;
    });
  }
  const from = today < PLAN_START ? PLAN_START : addDays(today, 1);
  return schedule(planOpts(state, today, { progress: p, from }));
}
export const liveMilestones = (state, today) =>
  schedule(planOpts(state, today, { from: today < PLAN_START ? PLAN_START : today })).milestones;

// ---- Striver sync ----
export const STEP_NAMES = DSA_STEPS.map((s) => s.name);
export function applySync(state, payload, today) {
  if (!payload || !payload.steps) throw new Error("Not a PrepPilot sync payload");
  let matched = 0;
  const before = Object.values(state.dsaDone).reduce((a, b) => a + b, 0);
  const firstSync = !state.sheet;
  for (const step of DSA_STEPS) {
    const v = payload.steps[step.name];
    if (!v || !Number.isFinite(v[0])) continue;
    const prevCount = step.done + (state.dsaDone[step.key] || 0);
    state.dsaDone[step.key] = Math.max(0, v[0] - step.done);
    matched++;
    if (today && !firstSync && v[0] !== prevCount) logDsa(state, today, step.key, prevCount, v[0]);
  }
  if (today) autoTickDsa(state, today);
  const after = Object.values(state.dsaDone).reduce((a, b) => a + b, 0);
  if (today && after > before && state.sheet) (state.syncDays = state.syncDays || {})[today] = true; // not on the very first sync
  state.sheet = { at: payload.t || Date.now(), overall: payload.overall || null, steps: payload.steps };
  if (today && today >= PLAN_START) ensureWeek(state, today, { force: true });
  return matched;
}

// Which sheet problems (by number within the step) were newly solved on `today`.
function logDsa(state, today, key, prevCount, newCount) {
  const day = ((state.dsaLog = state.dsaLog || {})[today] = state.dsaLog[today] || {});
  let list = day[key] || [];
  if (newCount > prevCount) for (let k = prevCount + 1; k <= newCount; k++) { if (!list.includes(k)) list.push(k); }
  else list = list.filter((k) => k <= newCount); // unticked on Striver
  if (list.length) day[key] = list.sort((a, b) => a - b); else delete day[key];
  if (!Object.keys(day).length) delete state.dsaLog[today];
}

// One-time fill for problems synced before the daily DSA log existed: anything solved since the
// 29 Sep baseline, before the first study day (5 Oct), counts as done ahead today.
export function backfillDsaLog(state, today) {
  if (state.dsaLogInit) return false;
  state.dsaLogInit = true;
  if (today >= "2026-10-05") return false;
  for (const step of DSA_STEPS) {
    const n = state.dsaDone[step.key] || 0;
    for (let k = step.done + 1; k <= step.done + n; k++) logDsa(state, today, step.key, k - 1, k);
  }
  return true;
}

// Problem-number range of a frozen DSA item (older saved items only have it in the text).
function rangeOf(it) {
  if (it.from && it.to) return [it.from, it.to];
  const m = /#(\d+)(?:–(\d+))? of/.exec(it.text || "");
  return m ? [+m[1], +(m[2] || m[1])] : null;
}

// A sync that covers today's planned DSA items ticks them on today's list too.
function autoTickDsa(state, today) {
  const fr = state.frozen[today];
  if (!fr) return;
  const chk = (state.checked[today] = state.checked[today] || {});
  fr.items.forEach((it, i) => {
    if (it.kind !== "dsa" || chk[i]) return;
    const step = DSA_STEPS.find((s) => s.key === it.step);
    const count = step.done + (state.dsaDone[it.step] || 0);
    const r = rangeOf(it);
    if (r && count >= r[1]) chk[i] = true; // counted by the sync already, so don't add to dsaDone again
  });
}

// DSA solved today (from syncs) that wasn't on today's own checklist.
export function dsaDoneToday(state, today) {
  const log = (state.dsaLog || {})[today] || {};
  const fr = state.frozen[today];
  const out = [];
  for (const step of DSA_STEPS) {
    let ks = log[step.key] || [];
    if (fr) for (const it of fr.items) { const r = it.kind === "dsa" && it.step === step.key && rangeOf(it); if (r) ks = ks.filter((k) => k < r[0] || k > r[1]); }
    if (ks.length) out.push({ step, ks, hours: ks.length * step.hrs });
  }
  return out;
}

export function parseSyncHash(hash) {
  const m = /^#sync=(.+)$/.exec(hash || "");
  if (!m) return null;
  const b64 = m[1].replace(/-/g, "+").replace(/_/g, "/");
  const json = decodeURIComponent(escape(atob(b64)));
  return JSON.parse(json);
}

// ---- blocked days ----
export function toggleBlock(state, date, label) {
  if (state.blocked[date]) { delete state.blocked[date]; return true; }
  if (Object.keys(state.checked[date] || {}).length) return false; // work already ticked that day
  state.blocked[date] = label || "Blocked";
  delete state.frozen[date];
  return true;
}

// ---- streak ----
// A day counts if you ticked something (incl. work done early) or a sync showed new problems.
// Exam, break, internship and blocked days (and days before the plan) pause the streak instead of breaking it.
// Today never breaks it: it only adds once you've done something.
const STREAK_FLOOR = "2026-09-25";
export function isActive(state, d) {
  return Object.keys(state.checked[d] || {}).length > 0 || (state.ahead[d] || []).length > 0 || !!(state.syncDays || {})[d];
}
function pauses(state, d) {
  return dayInfo(d).kind !== "study" || !!state.blocked[d];
}
export function streak(state, today) {
  let cur = 0;
  let d = today;
  if (isActive(state, d)) cur++;
  for (d = addDays(today, -1); d >= STREAK_FLOOR; d = addDays(d, -1)) {
    if (isActive(state, d)) cur++;
    else if (!pauses(state, d)) break;
  }
  let best = 0, run = 0;
  for (d = STREAK_FLOOR; d <= today; d = addDays(d, 1)) {
    if (isActive(state, d)) run++;
    else if (!pauses(state, d) && d !== today) run = 0;
    best = Math.max(best, run);
  }
  return { current: cur, best: Math.max(best, cur), activeToday: isActive(state, today) };
}

// ---- numbers for the Progress tab ----
export function trackTotals(state) {
  const out = {};
  for (const [track, list] of Object.entries(TASKS)) {
    const total = list.reduce((a, t) => a + t.hours, 0);
    const done = list.reduce((a, t) => a + Math.min(t.hours, state.tasks[t.id] || 0), 0);
    out[track] = { total, done };
  }
  return out;
}
export const appsSent = (state) =>
  TASKS.career.filter((t) => t.apps).reduce((a, t) => a + (Math.min(t.hours, state.tasks[t.id] || 0) >= t.hours - 0.2 ? t.apps : 0), 0);

export { dow, mondayOf, addDays, checkStartOf, checkEndOf, PLAN_START, PLAN_END };
