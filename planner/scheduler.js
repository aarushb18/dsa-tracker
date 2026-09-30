// Adaptive day-by-day scheduler.
// schedule(): turns plan data + progress into a dated plan from `from` onward.
// weeklyAdjust(): at each Monday, decides next week's catch-up based on planned vs done.
import {
  PLAN_START, PLAN_END, BLOCKS, EVENTS, PHASES, DSA_STEPS, DSA_DONE_AT_START,
  SUNDAY_FIXED, TASKS, MILESTONES, baseHours,
} from "./plan-data.js";

// ---------- date helpers (UTC date-only strings) ----------
const toDate = (s) => new Date(s + "T00:00:00Z");
const fmt = (d) => d.toISOString().slice(0, 10);
export const addDays = (s, n) => { const d = toDate(s); d.setUTCDate(d.getUTCDate() + n); return fmt(d); };
export const dow = (s) => toDate(s).getUTCDay(); // 0 = Sunday
export const mondayOf = (s) => addDays(s, -((dow(s) + 6) % 7));
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const dowName = (s) => DOW[dow(s)];

export function dayInfo(date) {
  const block = BLOCKS.find((b) => date >= b.from && date <= b.to);
  const events = EVENTS.filter((e) => e.date === date).map((e) => e.label);
  if (block) return { date, kind: block.type, label: block.label, block, events, hours: 0 };
  const phase = PHASES.find((p) => date >= p.from && date <= p.to);
  if (!phase) return { date, kind: "none", events, hours: 0 }; // outside the plan
  return { date, kind: "study", phase, events, hours: baseHours(date, dow(date)) };
}

// ---------- queues ----------
function buildQueues(progress) {
  const done = progress.tasks || {};
  const q = {};
  for (const [track, list] of Object.entries(TASKS)) {
    q[track] = list
      .map((task) => ({ ...task, track, remaining: Math.max(0, task.hours - (done[task.id] || 0)) }))
      .filter((task) => task.remaining > 0.2); // tiny remnants count as done
  }
  const dsaDone = progress.dsaDone || {};
  q.dsa = [];
  for (const step of DSA_STEPS) {
    const already = step.done + (dsaDone[step.key] || 0);
    for (let k = already + 1; k <= step.firstPass; k++) {
      q.dsa.push({ id: `dsa:${step.key}:${k}`, track: "dsa", step: step.key, stepName: step.name, k, of: step.firstPass, hours: step.hrs, remaining: step.hrs, stretch: !!step.stretch });
    }
  }
  return q;
}

const CARRY_OVER_WEIGHT = 0.15;
const FIRST_PHASE = {};
for (const p of PHASES) for (const tr of Object.keys(p.weights)) if (!(tr in FIRST_PHASE)) FIRST_PHASE[tr] = p.from;

const eligible = (task, date) => !task.notBefore || task.notBefore <= date;
const hasWork = (q, track, date) => (q[track] || []).some((task) => eligible(task, date));
const r2 = (x) => Math.round(x * 4) / 4; // quarter hours

// ---------- main ----------
export function schedule({ progress = {}, from = PLAN_START, to = PLAN_END, multipliers = {}, boosts = {}, extraBlocks = {}, initialCredit = {} } = {}) {
  const q = buildQueues(progress);
  const solvedBefore = DSA_DONE_AT_START + Object.values(progress.dsaDone || {}).reduce((a, b) => a + b, 0);
  let solved = solvedBefore;
  const finishedOn = {}; // task id -> date it finishes
  const dsaCountOn = {}; // total solved count -> date
  const credit = { ...initialCredit }; // banked hours per track, carried between days
  const days = [];

  for (let date = from; date <= to; date = addDays(date, 1)) {
    let info = dayInfo(date);
    // user-blocked days (hackathon, sick day, travel): no work planned, no catch-up owed
    if (info.kind === "study" && extraBlocks[date]) info = { ...info, kind: "blocked", label: extraBlocks[date], hours: 0 };
    const day = { ...info, dow: dowName(date), items: [], planned: 0 };
    days.push(day);
    if (info.kind !== "study") continue;

    const mult = multipliers[mondayOf(date)] || 1;
    let cap = info.hours * mult;

    // Fixed Sunday items
    if (dow(date) === 0) {
      for (const f of SUNDAY_FIXED) {
        if (date >= f.from && cap >= f.hours) {
          day.items.push({ track: f.track, id: `${f.id}:${date}`, title: f.title, hours: f.hours, fixed: true });
          cap -= f.hours;
        }
      }
    }

    // Each track banks "credit" hours by phase weight; work is scheduled in >=0.5h chunks
    // (whole problems for DSA), so small shares accumulate instead of being lost.
    // Tracks whose phase has passed but still have unfinished work get a carry-over share,
    // so nothing is orphaned when a week goes badly.
    const phaseW = { ...info.phase.weights };
    for (const [tr, start] of Object.entries(FIRST_PHASE)) {
      if (!(tr in phaseW) && date > start && hasWork(q, tr, date)) phaseW[tr] = CARRY_OVER_WEIGHT;
    }
    for (const tr of Object.keys(phaseW)) phaseW[tr] *= boosts[tr] || 1; // tracks behind on a milestone get priority
    const weights = Object.entries(phaseW).filter(([tr]) => hasWork(q, tr, date));
    const wsum = weights.reduce((a, [, w]) => a + w, 0);
    for (const [tr, w] of weights) credit[tr] = Math.min((credit[tr] || 0) + (cap * w) / wsum, 3);
    const dayLimit = cap + 0.25;
    let used = 0;
    const order = [...weights].sort((a, b) => (credit[b[0]] || 0) - (credit[a[0]] || 0));

    // Short days: at most 2 subjects (less context switching); long days: up to 3.
    const maxTracks = cap <= 2.25 ? 2 : 3;
    let tracksUsed = 0;
    for (const [tr] of order) {
      if (tracksUsed >= maxTracks) break;
      const before = day.items.length;
      if (tr === "dsa") {
        const picked = [];
        while (q.dsa.length && credit.dsa >= q.dsa[0].hours * 0.85 && used + q.dsa[0].hours <= dayLimit + 0.35) {
          const u = q.dsa.shift();
          credit.dsa -= u.hours; used += u.hours;
          solved += 1;
          dsaCountOn[solved] = date;
          finishedOn[u.id] = date;
          if (!q.dsa.some((x) => x.step === u.step)) finishedOn[`dsa:${u.step}:last`] = date;
          picked.push(u);
        }
        for (const u of picked) {
          const last = day.items[day.items.length - 1];
          if (last && last.track === "dsa" && last.step === u.step && !last.fixed) {
            last.to = u.k; last.hours += u.hours; last.count += 1; last.unitIds.push(u.id);
          } else {
            day.items.push({ track: "dsa", step: u.step, stepName: u.stepName, from: u.k, to: u.k, of: u.of, count: 1, hours: u.hours, stretch: u.stretch, unitIds: [u.id] });
          }
        }
        if (day.items.length > before) tracksUsed++;
        continue;
      }
      const list = q[tr];
      while (list.some((task) => eligible(task, date))) {
        const idx = list.findIndex((task) => eligible(task, date));
        const task = list[idx];
        const room = r2(Math.min(credit[tr], dayLimit - used));
        const use = Math.min(room, task.remaining);
        const finishes = use >= task.remaining - 0.01;
        if (use <= 0.01 || (!finishes && use < 0.5)) break;
        const doneBefore = task.hours - task.remaining;
        task.remaining -= use; credit[tr] -= use; used += use;
        day.items.push({ track: tr, id: task.id, title: task.title, hours: use, part: task.hours > use + 0.01 || doneBefore > 0.01 ? { from: doneBefore, to: task.hours - task.remaining, of: task.hours } : null });
        if (task.remaining <= 0.01) { finishedOn[task.id] = date; list.splice(idx, 1); }
      }
      if (day.items.length > before) tracksUsed++;
    }
    // Tracks that ran out of work release their credit
    for (const tr of Object.keys(credit)) if (!hasWork(q, tr, date) && (tr !== "dsa" || !q.dsa.length)) credit[tr] = 0;

    day.planned = day.items.reduce((a, i) => a + i.hours, 0);
  }

  // Milestones
  const milestones = MILESTONES.map((m) => {
    let projected = null;
    if (m.task.startsWith("dsa:count:")) {
      const n = +m.task.split(":")[2];
      projected = n <= solvedBefore ? "done" : dsaCountOn[n] || null;
    } else if (m.task.startsWith("dsa:")) {
      const key = m.task.split(":")[1];
      const step = DSA_STEPS.find((s) => s.key === key);
      const doneN = step.done + ((progress.dsaDone || {})[key] || 0);
      projected = doneN >= step.firstPass ? "done" : finishedOn[m.task] || null;
    } else if (progress.tasks && isTaskDone(m.task, progress)) projected = "done";
    else projected = finishedOn[m.task] || null;
    const status = projected === "done" ? "done" : !projected ? "at risk" : projected <= m.target ? "on track" : "late";
    return { ...m, projected, status };
  });

  return { days, milestones, credit, solvedAtEnd: solved, leftover: Object.fromEntries(Object.entries(q).map(([k, v]) => [k, v.reduce((a, x) => a + x.remaining, 0)])) };
}

function isTaskDone(id, progress) {
  const task = Object.values(TASKS).flat().find((x) => x.id === id);
  return task && (progress.tasks[id] || 0) >= task.hours - 0.2;
}

const TRACK_OF = (taskId) => taskId.startsWith("dsa") ? "dsa" : taskId.startsWith("proj") ? "project" : taskId.startsWith("car") ? "career" : taskId.split("-")[0];

// Tracks with a late or at-risk upcoming milestone get 1.5x share next week.
export function milestoneBoosts(milestones, today) {
  const boosts = {};
  for (const m of milestones) {
    if (m.status === "late" || (m.status === "at risk" && m.target >= today)) boosts[TRACK_OF(m.task)] = 1.5;
  }
  return boosts;
}

// Next week's catch-up: behind → up to +25% hours next week; ahead → same hours, work simply continues further along.
export function weeklyAdjust({ plannedToDate, doneToDate, nextWeekBase }) {
  const deficit = plannedToDate - doneToDate;
  if (deficit <= 0.25 || !nextWeekBase) return { multiplier: 1, extra: 0, deficit, ahead: Math.max(0, -deficit) };
  // More than ~2 weeks behind: stop inflating weeks you can't sustain — flag a rescope instead.
  if (deficit > 2 * nextWeekBase) return { multiplier: 1, extra: 0, deficit, ahead: 0, rescope: true };
  const extra = Math.min(deficit, 0.25 * nextWeekBase);
  return { multiplier: 1 + extra / nextWeekBase, extra, deficit, ahead: 0 };
}

// Human-readable line for one plan item
export function describe(item) {
  if (item.track === "dsa" && !item.fixed) {
    const range = item.from === item.to ? `#${item.from}` : `#${item.from}–${item.to}`;
    return `Solve ${item.count} problem${item.count > 1 ? "s" : ""} — ${item.stepName} ${range} of ${item.of}${item.stretch ? " (stretch)" : ""}`;
  }
  const part = item.part ? ` [${fmtH(item.part.from)}→${fmtH(item.part.to)} of ${fmtH(item.part.of)}h]` : "";
  return item.title + part;
}
export const fmtH = (h) => (Math.round(h * 4) / 4).toString();
