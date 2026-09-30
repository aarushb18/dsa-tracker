// State + weekly re-plan logic. No DOM in here, so it can be tested in Node.
import { schedule, weeklyAdjust, milestoneBoosts, describe, dayInfo, addDays, mondayOf, dow } from "./planner/scheduler.js";
import { PLAN_START, PLAN_END, DSA_STEPS, TASKS } from "./planner/plan-data.js";

export const KEY = "prepplanner.v1";
export const STEP_HRS = Object.fromEntries(DSA_STEPS.map((s) => [s.key, s.hrs]));

export const todayIST = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now); // YYYY-MM-DD

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
  const w = state.weeks[mondayOf(today)];
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

// ---- weekly re-plan: runs once per Monday-week, from real progress ----
export function ensureWeek(state, today, { force = false } = {}) {
  if (today < PLAN_START || today > PLAN_END) return null;
  const mon = mondayOf(today);
  if (mon < PLAN_START) return null; // exam days before the first full week
  if (state.weeks[mon] && !force) return state.weeks[mon];
  if (!state.startDate) state.startDate = today > PLAN_START ? today : PLAN_START;
  const from = state.startDate;
  const plannedToDate = mon > from ? plannedBetween(from, addDays(mon, -1), state) : 0;
  const doneToDate = workDone(state);
  const nextWeekBase = capacity(mon, addDays(mon, 6), state);
  const adj = weeklyAdjust({ plannedToDate, doneToDate, nextWeekBase });
  const mult = adj.multiplier || 1;
  const boosts = milestoneBoosts(
    schedule({ progress: progressOf(state), from: mon, multipliers: { ...multipliersOf(state), [mon]: mult }, extraBlocks: state.blocked }).milestones,
    mon,
  );
  state.weeks[mon] = {
    multiplier: mult, extraHours: adj.extra || 0, deficit: adj.deficit || 0, ahead: adj.ahead || 0,
    rescope: !!adj.rescope, boosts, plannedToDate, doneToDate, at: today,
  };
  return state.weeks[mon];
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
  return { kind, track: it.track, text: describe(it), hours: it.hours, id: it.id || null, step: it.step || null, count: it.count || 0, stretch: !!it.stretch };
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
  for (const step of DSA_STEPS) {
    const v = payload.steps[step.name];
    if (v && Number.isFinite(v[0])) { state.dsaDone[step.key] = Math.max(0, v[0] - step.done); matched++; }
  }
  state.sheet = { at: payload.t || Date.now(), overall: payload.overall || null, steps: payload.steps };
  if (today && today >= PLAN_START) ensureWeek(state, today, { force: true });
  return matched;
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

export { dow, mondayOf, addDays, PLAN_START, PLAN_END };
