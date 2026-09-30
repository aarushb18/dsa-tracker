import * as S from "./store.js";
import { TRACK_LABELS, DSA_STEPS, TASKS, BLOCKS } from "./planner/plan-data.js";
import { dayInfo, addDays, mondayOf, dow, describe } from "./planner/scheduler.js";
import { bookmarkletHref } from "./sync.js";

const { PLAN_START, PLAN_END } = S;
const $app = document.getElementById("app");
let state = S.loadState();
const ui = { view: readPref("view", "today"), month: null, sel: null };
const save = () => S.saveState(state);

function readPref(k, d) { try { return localStorage.getItem("prepplanner.pref." + k) || d; } catch (e) { return d; } }
function writePref(k, v) { try { localStorage.setItem("prepplanner.pref." + k, v); } catch (e) { /* ignore */ } }

// ---------- helpers ----------
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOWN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ymd = (d) => d.split("-").map(Number);
const fmtDay = (d) => { const [, m, dd] = ymd(d); return `${DOWN[dow(d)]} ${dd} ${MON[m - 1]}`; };
const fmtShort = (d) => { const [, m, dd] = ymd(d); return `${dd} ${MON[m - 1]}`; };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const hh = (n) => (Math.round(n * 4) / 4).toString();
const label = (tr) => TRACK_LABELS[tr] || "Review";
const shortBlock = (b) => b.label.split(" — ")[0].split(";")[0];
const CHECK = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>`;

function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast"; el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// ---------- shell ----------
function render() {
  const t = S.todayIST();
  S.ensureWeek(state, t);
  S.ensureDay(state, t);
  save();
  const views = { today: viewToday, planner: viewPlanner, progress: viewProgress, sync: viewSync };
  const nav = [["today", "Today"], ["planner", "Planner"], ["progress", "Progress"], ["sync", "Sync"]]
    .map(([v, n]) => `<button data-a="nav" data-v="${v}" ${ui.view === v ? 'aria-current="page"' : ""}>${n}</button>`).join("");
  $app.innerHTML = `
    <header class="top"><div class="wrap">
      <div class="brand"><i>✓</i> PrepPilot</div>
      <nav class="nav">${nav}</nav>
    </div></header>
    <main class="wrap">${(views[ui.view] || viewToday)(t)}</main>`;
}

// ---------- shared bits ----------
function itemRow(it, opts) {
  const { date, i, checked, interactive } = opts;
  const dsa = it.track === "dsa" && it.kind === "dsa";
  return `<li class="item ${checked ? "done" : ""} t-${it.track}">
    <button class="tick" role="checkbox" aria-checked="${!!checked}" aria-label="Mark done" ${interactive ? `data-a="tick" data-date="${date}" data-i="${i}"` : "disabled"}>${CHECK}</button>
    <div class="txt"><span class="main">${esc(it.text)}</span>
      <div class="meta"><span class="tag">${label(it.track)}</span><span>${hh(it.hours)}h</span>${it.stretch ? '<span class="chip">stretch</span>' : ""}${dsa ? '<span class="small">tick it on Striver too</span>' : ""}</div>
    </div></li>`;
}
function projItemRow(it) {
  return `<li class="item t-${it.track}"><span class="dot t-${it.track}" style="margin-top:8px"></span>
    <div class="txt"><span class="main">${esc(describe(it))}</span>
    <div class="meta"><span class="tag">${label(it.track)}</span><span>${hh(it.hours)}h</span></div></div></li>`;
}
function statusChip(m) {
  if (m.status === "done") return '<span class="chip good">Done</span>';
  if (m.status === "on track") return '<span class="chip good">On track</span>';
  if (m.status === "late") return '<span class="chip bad">Late</span>';
  return '<span class="chip warn">At risk</span>';
}
function nextStudyDay(t) {
  const proj = S.project(state, t);
  return proj.days.find((d) => d.kind === "study" && d.items.length) || null;
}
function blockBanner(kind, text) {
  return `<div class="banner ${kind}"><b>${esc(text)}</b></div>`;
}

// ---------- Today ----------
function viewToday(t) {
  const info = dayInfo(t);
  const userBlock = state.blocked[t];
  const wk = state.weeks[mondayOf(t)];
  let html = `<h1>Today</h1><p class="sub">${fmtDay(t)}${info.phase ? " · " + esc(info.phase.name) : ""}</p>`;
  let left = "";

  if (t < PLAN_START) {
    const days = Math.round((Date.parse(PLAN_START) - Date.parse(t)) / 864e5);
    left += `<div class="banner exam"><b>Your plan starts ${fmtDay(PLAN_START)}</b>${days} day${days === 1 ? "" : "s"} to go. CAT 2 is first. Nothing to do until it's over except the exams.</div>`;
  } else if (t > PLAN_END) {
    left += blockBanner("internship", "The plan is finished. Good luck!");
  } else if (userBlock) {
    left += `<div class="banner blocked"><b>${esc(userBlock)}</b>You blocked this day. Nothing is planned and it won't count as behind.
      <div class="btns" style="margin-top:8px"><button class="btn" data-a="block" data-date="${t}">Unblock</button></div></div>`;
  } else if (info.kind !== "study") {
    left += `<div class="banner ${info.kind}"><b>${esc(info.label || "No plan today")}</b>${info.kind === "exam" ? "Exams only. The plan resumes after." : ""}
      ${info.events.length ? `<div class="pin small" style="margin-top:6px">📌 ${info.events.map(esc).join(" · ")}</div>` : ""}</div>`;
  } else {
    const fr = state.frozen[t];
    const p = S.dayProgress(state, t);
    const pct = p && p.planned ? Math.min(100, Math.round((p.done / p.planned) * 100)) : 0;
    const chk = state.checked[t] || {};
    const allDone = fr && fr.items.length && p.doneCount === fr.items.length;
    left += `<div class="card">
      <div class="row"><h2 style="margin:0">Due today</h2><span class="muted small">${hh(p ? p.done : 0)}h of ${hh(p ? p.planned : 0)}h</span></div>
      <div class="bar ${allDone ? "good" : ""}" style="margin:10px 0 4px"><i style="width:${pct}%"></i></div>
      ${info.events.length ? `<div class="pin small" style="margin:8px 0">📌 ${info.events.map(esc).join(" · ")}</div>` : ""}
      ${fr && fr.items.length
        ? `<ul class="items">${fr.items.map((it, i) => itemRow(it, { date: t, i, checked: !!chk[i], interactive: true })).join("")}</ul>`
        : '<p class="muted">Light day: nothing planned. Rest or get ahead.</p>'}
      ${allDone ? '<p class="chip good" style="margin-top:10px">All done for today 🎉</p>' : ""}
    </div>`;
  }
  if (t >= PLAN_START && t <= PLAN_END && info.kind === "study" && !userBlock) {
    left += `<div class="btns"><button class="btn" data-a="block" data-date="${t}">Block today (hackathon / travel / sick)</button></div>`;
  }

  // what's next
  const nx = (info.kind !== "study" || userBlock || t < PLAN_START || (state.frozen[t] && S.dayProgress(state, t).doneCount === state.frozen[t].items.length)) ? nextStudyDay(t) : null;
  if (nx) {
    left += `<div class="card" style="margin-top:14px"><h2>${t < PLAN_START || info.kind !== "study" ? "First study day" : "Next up"}: ${fmtDay(nx.date)}</h2>
      <ul class="items">${nx.items.slice(0, 5).map(projItemRow).join("")}</ul>
      <p class="muted small" style="margin:6px 0 0">Projected. It updates as you make progress.</p></div>`;
  }

  // right column
  let right = "";
  const mon = mondayOf(t);
  if (wk && t >= PLAN_START && t <= PLAN_END) {
    let note = "On plan.";
    let chip = '<span class="chip good">On plan</span>';
    if (wk.rescope) { chip = '<span class="chip bad">Rescope</span>'; note = "You're well behind. Adding more hours won't fix it. Drop the stretch DSA topics or move the start of applications back a week."; }
    else if (wk.multiplier > 1.01) { chip = `<span class="chip warn">+${Math.round((wk.multiplier - 1) * 100)}% catch-up</span>`; note = `You were ${hh(wk.deficit)}h behind last week, so this week carries a little more work.`; }
    else if (wk.ahead > 0.5) { chip = `<span class="chip good">${hh(wk.ahead)}h ahead</span>`; note = "You're ahead. The plan picks up from where you actually are, so nothing is repeated."; }
    const boosts = Object.keys(wk.boosts || {}).map(label).join(", ");
    right += `<div class="card"><div class="row"><h2 style="margin:0">Week of ${fmtShort(mon)}</h2>${chip}</div>
      <p class="small" style="margin:8px 0 0">${esc(note)}</p>
      ${boosts ? `<p class="small muted" style="margin:6px 0 0">Priority: ${esc(boosts)} (a milestone is behind)</p>` : ""}
      ${dow(t) === 0 ? '<p class="small pin" style="margin:8px 0 0">Sunday: sync your Striver progress so tomorrow\'s plan is right.</p><div class="btns" style="margin-top:6px"><button class="btn primary" data-a="nav" data-v="sync">Sync now</button></div>' : ""}</div>`;
  }
  const ms = S.liveMilestones(state, t).filter((m) => m.status !== "done").sort((a, b) => a.target.localeCompare(b.target)).slice(0, 4);
  if (ms.length) {
    right += `<div class="card"><h2>Next milestones</h2>${ms.map((m) => `<div style="margin-bottom:10px"><div class="row"><span class="small">${esc(m.label)}</span>${statusChip(m)}</div>
      <div class="muted small">target ${fmtShort(m.target)}${m.projected ? " · projected " + fmtShort(m.projected) : ""}</div></div>`).join("")}
      <button class="btn" data-a="nav" data-v="progress">All progress</button></div>`;
  }
  return html + `<div class="grid2"><div>${left}</div><div>${right}</div></div>`;
}

// ---------- Planner ----------
const MONTHS = [];
for (let y = 2026, m = 10; !(y === 2027 && m === 8); m++) { if (m === 13) { m = 1; y++; } MONTHS.push(`${y}-${String(m).padStart(2, "0")}`); }

function viewPlanner(t) {
  const proj = S.project(state, t);
  const pm = Object.fromEntries(proj.days.map((d) => [d.date, d]));
  const clamp = (mk) => (mk < MONTHS[0] ? MONTHS[0] : mk > MONTHS[MONTHS.length - 1] ? MONTHS[MONTHS.length - 1] : mk);
  if (!ui.month) ui.month = clamp(t.slice(0, 7));
  if (!ui.sel) ui.sel = t >= PLAN_START && t <= PLAN_END ? t : PLAN_START;

  const tabs = MONTHS.map((mk) => { const [y, m] = mk.split("-").map(Number); return `<button data-a="month" data-m="${mk}" aria-current="${mk === ui.month}">${MON[m - 1]}${m === 1 || mk === MONTHS[0] ? " ’" + String(y).slice(2) : ""}</button>`; }).join("");
  const [Y, M] = ui.month.split("-").map(Number);
  const first = `${ui.month}-01`;
  let d = mondayOf(first);
  const cells = [];
  for (let n = 0; n < 42; n++, d = addDays(d, 1)) {
    if (n >= 35 && d.slice(0, 7) !== ui.month) break;
    cells.push(cellHtml(d, t, pm));
  }
  const heads = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((x) => `<div class="dh">${x}</div>`).join("");

  // month summary
  let planned = 0;
  for (const dd of Object.keys(pm)) if (dd.startsWith(ui.month)) planned += pm[dd].planned || 0;
  for (const dd of Object.keys(state.frozen)) if (dd.startsWith(ui.month) && dd <= t) planned += state.frozen[dd].planned;
  const blocks = BLOCKS.filter((b) => b.from.slice(0, 7) <= ui.month && b.to.slice(0, 7) >= ui.month);

  return `<h1>Planner</h1><p class="sub">${MONTH_FULL[M - 1]} ${Y} · about ${hh(planned)}h of planned work</p>
    <div class="months">${tabs}</div>
    <div class="card"><div class="cal">${heads}${cells.join("")}</div>
      <div class="legend"><span style="--c:var(--surface)">Study day</span><span style="--c:var(--exam)">Exams</span><span style="--c:var(--rest)">Break</span><span style="--c:var(--blocked)">Blocked by you</span><span style="--c:var(--intern)">Internship</span></div>
    </div>
    ${blocks.length ? `<div class="card"><h2>Exam and break periods this month</h2>${blocks.map((b) => `<div class="small" style="margin:4px 0"><b>${fmtShort(b.from)}${b.from !== b.to ? " – " + fmtShort(b.to) : ""}</b> · ${esc(b.label)}</div>`).join("")}</div>` : ""}
    ${dayPanel(ui.sel, t, pm)}`;
}

function cellHtml(date, t, pm) {
  const info = dayInfo(date);
  const inMonth = date.slice(0, 7) === ui.month;
  const dn = ymd(date)[2];
  if (info.kind === "none") return `<div class="cell out"><span class="dn">${dn}</span></div>`;
  const ub = state.blocked[date];
  const kind = ub ? "blocked" : info.kind;
  const fr = state.frozen[date];
  const items = fr ? fr.items : ((pm[date] && pm[date].items) || []);
  let sub = "";
  if (kind === "study") {
    const pl = fr ? fr.planned : (pm[date] && pm[date].planned) || 0;
    const p = S.dayProgress(state, date);
    sub = p && date < t ? `<span class="hrs">${p.doneCount}/${p.count} ✓</span>` : pl ? `<span class="hrs">${hh(pl)}h</span>` : "";
  } else if (kind === "blocked") sub = `<span class="lbl">${esc(ub || "Blocked")}</span>`;
  else if (info.block) sub = `<span class="lbl">${esc(shortBlock(info.block))}</span>`;
  const tracks = [...new Set(items.map((i) => i.track))].slice(0, 5);
  return `<button class="cell ${kind} ${date === t ? "today" : ""} ${date === ui.sel ? "sel" : ""} ${date < t ? "past" : ""} ${inMonth ? "" : "out"}" data-a="day" data-date="${date}">
    <span class="dn">${dn}</span>${sub}<span class="dots">${tracks.map((tr) => `<span class="dot t-${tr}"></span>`).join("")}</span></button>`;
}

function dayPanel(date, t, pm) {
  const info = dayInfo(date);
  const ub = state.blocked[date];
  const fr = state.frozen[date];
  let body = "";
  if (info.kind === "none") body = '<p class="muted">Outside the plan.</p>';
  else if (ub) body = `<div class="banner blocked"><b>${esc(ub)}</b>You blocked this day.</div>`;
  else if (info.kind !== "study") body = `<div class="banner ${info.kind}"><b>${esc(info.label)}</b></div>`;
  else if (fr) {
    const chk = state.checked[date] || {};
    body = fr.items.length
      ? `<ul class="items">${fr.items.map((it, i) => itemRow(it, { date, i, checked: !!chk[i], interactive: true })).join("")}</ul>`
      : '<p class="muted">Nothing was planned.</p>';
  } else if (date < t) body = '<p class="muted">You didn\'t open the app on this day, so no checklist was recorded.</p>';
  else {
    const day = pm[date];
    body = day && day.items.length
      ? `<ul class="items">${day.items.map(projItemRow).join("")}</ul><p class="muted small" style="margin:6px 0 0">Projected. It updates as you make progress.</p>`
      : '<p class="muted">Nothing planned.</p>';
  }
  const canBlock = date >= t && (info.kind === "study" || ub);
  return `<div class="card"><div class="row"><h2 style="margin:0">${fmtDay(date)}</h2>
    ${canBlock ? `<button class="btn" data-a="block" data-date="${date}">${ub ? "Unblock" : "Block this day"}</button>` : ""}</div>
    ${info.events.length ? `<div class="pin small" style="margin:8px 0">📌 ${info.events.map(esc).join(" · ")}</div>` : ""}
    <div style="margin-top:8px">${body}</div></div>`;
}

// ---------- Progress ----------
function viewProgress(t) {
  const ms = S.liveMilestones(state, t);
  const sheet = state.sheet;
  const totals = S.trackTotals(state);
  const apps = S.appsSent(state);
  const stepRows = DSA_STEPS.map((s) => {
    const solved = Math.min(s.firstPass, s.done + (state.dsaDone[s.key] || 0));
    const pct = Math.round((solved / s.firstPass) * 100);
    const sh = sheet && sheet.steps && sheet.steps[s.name];
    return `<div style="margin-bottom:11px"><div class="row small"><span>${esc(s.name)}${s.stretch ? ' <span class="chip">stretch</span>' : ""}</span><span class="muted">${solved}/${s.firstPass}${sh ? ` · sheet ${sh[0]}/${sh[1]}` : ""}</span></div>
      <div class="bar" style="margin-top:4px"><i style="width:${pct}%"></i></div></div>`;
  }).join("");
  const trackRows = Object.entries(totals).map(([tr, v]) => {
    const pct = Math.round((v.done / v.total) * 100);
    return `<div style="margin-bottom:11px"><div class="row small"><span class="t-${tr}"><span class="tag">${label(tr)}</span></span><span class="muted">${hh(v.done)} / ${hh(v.total)}h</span></div>
      <div class="bar" style="margin-top:4px"><i style="width:${pct}%"></i></div></div>`;
  }).join("");
  const weeks = Object.entries(state.weeks).sort(([a], [b]) => b.localeCompare(a)).slice(0, 8);
  return `<h1>Progress</h1>
    <p class="sub">${sheet ? `Striver sheet: <b>${sheet.overall ? sheet.overall[0] + " / " + sheet.overall[1] : "synced"}</b> solved · last sync ${new Date(sheet.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : 'Striver sheet not synced yet. <a href="#" data-a="nav" data-v="sync">Set it up</a>'}</p>
    <div class="card"><h2>Milestones</h2><div class="scroll"><table><thead><tr><th>Milestone</th><th>Target</th><th>Projected</th><th></th></tr></thead><tbody>
      ${ms.map((m) => `<tr><td>${esc(m.label)}</td><td>${fmtShort(m.target)}</td><td>${m.projected && m.projected !== "done" ? fmtShort(m.projected) : m.projected === "done" ? "done" : "not by April"}</td><td>${statusChip(m)}</td></tr>`).join("")}
    </tbody></table></div></div>
    <div class="grid2" style="grid-template-columns:1fr 1fr">
      <div class="card"><h2>DSA: first pass</h2>${stepRows}<p class="muted small" style="margin:0">Hard problems are skipped on the first pass.</p></div>
      <div><div class="card"><h2>Hours done by track</h2>${trackRows}
        <div class="row small" style="margin-top:4px"><span><b>Applications sent</b></span><span class="stat" style="font-size:20px">${apps}</span></div></div>
      ${weeks.length ? `<div class="card"><h2>Weekly re-plan log</h2><div class="scroll"><table><thead><tr><th>Week</th><th>Behind</th><th>This week</th></tr></thead><tbody>
        ${weeks.map(([m, w]) => `<tr><td>${fmtShort(m)}</td><td>${w.deficit > 0.25 ? hh(w.deficit) + "h" : "–"}</td><td>${w.rescope ? "rescope" : w.multiplier > 1.01 ? "+" + Math.round((w.multiplier - 1) * 100) + "%" : "normal"}</td></tr>`).join("")}</tbody></table></div></div>` : ""}</div>
    </div>`;
}

// ---------- Sync ----------
function viewSync() {
  const href = bookmarkletHref(location.origin);
  const s = state.sheet;
  return `<h1>Sync</h1><p class="sub">Bring your Striver sheet progress in with one click.</p>
    <div class="card"><h2>Striver A2Z bookmarklet</h2>
      <ol class="steps">
        <li>Drag this button to your browser's bookmarks bar: <a class="bm" id="bm" href="${href}" data-a="bm">PrepPilot sync</a> <span class="muted small">(don't click it here)</span></li>
        <li>Open your <a href="https://takeuforward.org/prep-hub/strivers-a2z-dsa-sheet?page=sheet" target="_blank" rel="noopener">Striver A2Z sheet</a> while logged in.</li>
        <li>Click the <b>PrepPilot sync</b> bookmark. This site opens in a new tab with your progress applied.</li>
      </ol>
      <p class="small muted" style="margin:6px 0 0">It only reads the "done / total" numbers next to each step name, using your own login in your own browser. Nothing is stored anywhere except this browser. Do it every Sunday (the plan reminds you).</p>
      ${s ? `<p class="small" style="margin:10px 0 0">Last sync: <b>${new Date(s.at).toLocaleString("en-GB")}</b>${s.overall ? " · " + s.overall[0] + "/" + s.overall[1] + " solved" : ""} · ${Object.keys(s.steps).length} steps read.</p>` : ""}
    </div>
    <div class="card"><h2>Popup blocked? Paste it instead</h2>
      <p class="small muted" style="margin:0 0 8px">If the bookmarklet shows a text box with data, copy it and paste it here.</p>
      <textarea id="paste" rows="3" placeholder='{"v":1,"steps":{...}}'></textarea>
      <div class="btns" style="margin-top:8px"><button class="btn primary" data-a="paste">Apply</button></div></div>
    <div class="card"><h2>Backup</h2>
      <p class="small muted" style="margin:0 0 8px">Your progress lives in this browser only. Export a backup now and then, and use it to move to another device.</p>
      <div class="btns"><button class="btn" data-a="export">Export backup</button>
      <label class="btn">Import backup<input type="file" id="imp" accept="application/json" hidden></label>
      <button class="btn danger" data-a="reset">Reset everything</button></div></div>`;
}

// ---------- events ----------
$app.addEventListener("click", (e) => {
  const el = e.target.closest("[data-a]");
  if (!el) return;
  const a = el.dataset.a;
  const t = S.todayIST();
  if (a === "bm") { e.preventDefault(); toast("Drag this button to your bookmarks bar"); return; }
  if (a === "nav") { e.preventDefault(); ui.view = el.dataset.v; writePref("view", ui.view); render(); window.scrollTo(0, 0); return; }
  if (a === "tick") { S.toggleItem(state, el.dataset.date, +el.dataset.i); save(); render(); return; }
  if (a === "day") { ui.sel = el.dataset.date; const mk = el.dataset.date.slice(0, 7); if (MONTHS.includes(mk)) ui.month = mk; render(); return; }
  if (a === "month") { ui.month = el.dataset.m; render(); return; }
  if (a === "block") {
    const date = el.dataset.date;
    let lbl = "";
    if (!state.blocked[date]) { lbl = prompt("Why are you blocking this day? (e.g. Hackathon, Travel, Sick)", "Hackathon"); if (lbl === null) return; }
    if (!S.toggleBlock(state, date, lbl.trim())) { toast("You've already ticked work on that day, so it can't be blocked."); return; }
    S.ensureWeek(state, t, { force: true }); save(); render(); return;
  }
  if (a === "paste") {
    const txt = document.getElementById("paste").value.trim();
    try { applyPayload(JSON.parse(txt)); } catch (err) { toast("That doesn't look like PrepPilot data"); }
    return;
  }
  if (a === "export") {
    const blob = new Blob([JSON.stringify(state)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob); link.download = `preppilot-backup-${t}.json`; link.click();
    return;
  }
  if (a === "reset") {
    if (confirm("Delete all your progress in this browser? Export a backup first if unsure.")) { state = S.freshState(); save(); render(); toast("Reset"); }
  }
});
$app.addEventListener("change", (e) => {
  if (e.target.id !== "imp" || !e.target.files[0]) return;
  const rd = new FileReader();
  rd.onload = () => {
    try { const s = JSON.parse(rd.result); if (s.v !== 1) throw new Error(); state = { ...S.freshState(), ...s }; save(); render(); toast("Backup imported"); }
    catch (err) { toast("That file isn't a PrepPilot backup"); }
  };
  rd.readAsText(e.target.files[0]);
});

function applyPayload(payload) {
  const n = S.applySync(state, payload, S.todayIST());
  save(); ui.view = "progress"; writePref("view", "progress"); render();
  toast(`Synced ${n} steps from Striver`);
}
function handleHash() {
  if (!location.hash.startsWith("#sync=")) return;
  try { applyPayload(S.parseSyncHash(location.hash)); }
  catch (err) { toast("Couldn't read the sync data"); }
  history.replaceState(null, "", location.pathname + location.search);
}

document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });
window.addEventListener("hashchange", handleHash);
render();
handleHash();

// expose for tests
window.__pp = { get state() { return state; }, S };
