import * as S from "./store.js";
import { TRACK_LABELS, DSA_STEPS, TASKS, BLOCKS, EVENTS } from "./planner/plan-data.js";
import { dayInfo, addDays, mondayOf, dow, describe } from "./planner/scheduler.js";
import { bookmarkletHref } from "./sync.js";
import { RESOURCES } from "./planner/resources.js";
import { quoteFor } from "./quotes.js";

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

const STRIVER = "https://takeuforward.org/prep-hub/strivers-a2z-dsa-sheet?page=sheet";
const baseId = (id) => (id || "").split(":")[0];
// "▶ Watch" links for an item (one link, or a small expandable list)
function resLinks(it) {
  if (it.track === "dsa" && !it.fixed && (it.step || it.kind === "dsa")) return `<a class="watch" href="${STRIVER}" target="_blank" rel="noopener">▶ Striver</a>`;
  const list = RESOURCES[baseId(it.id)];
  if (!list || !list.length) return "";
  const role = (r) => (/^Alt: /.test(r.t) ? "alt" : /^Optional: /.test(r.t) ? "optional" : "");
  const name = (r) => r.t.replace(/^(Alt|Optional): /, "");
  const tag = (r) => (role(r) ? `<span class="rk ${role(r)}">${role(r)}</span>` : "") +
    (r.kind === "article" ? '<span class="rk">article</span>' : r.kind === "search" ? '<span class="rk">search</span>' : r.kind === "playlist" ? '<span class="rk">playlist</span>' : "") + (r.lang === "EN" ? '<span class="rk">EN</span>' : "");
  const a = (r) => `<a href="${esc(r.u)}" target="_blank" rel="noopener">${esc(name(r))}</a>${tag(r)}`;
  if (list.length === 1) return `<a class="watch" href="${esc(list[0].u)}" target="_blank" rel="noopener" title="${esc(list[0].t)}">▶ Watch</a>`;
  const roles = new Set(list.map(role));
  const hint = [baseId(it.id) === "java-01" ? "Scan W3Schools, then watch only what you don't know" : "Watch all, in order",
    roles.has("alt") ? "alt = backup if you don't like the first" : "",
    roles.has("optional") ? "optional = skip if short on time" : "",
    list.some((r) => r.kind === "search") ? "search = pick any good result" : ""].filter(Boolean).join(" · ");
  return `<details class="res"><summary>▶ Watch · ${list.length}</summary><p class="res-hint">${esc(hint)}</p><ol>${list.map((r) => `<li class="${role(r)}">${a(r)}</li>`).join("")}</ol></details>`;
}

// Long tasks are split into parts across days. Show the title once, and the part as "where you are in the task".
const PART_RE = /\s*\[([\d.]+)→([\d.]+) of ([\d.]+)h\]$/;
function splitPart(text) {
  const m = PART_RE.exec(text || "");
  return m ? { title: text.slice(0, m.index), part: { from: +m[1], to: +m[2], of: +m[3] } } : { title: text, part: null };
}
function partHtml(part, done) {
  if (!part) return "";
  const a = Math.round((part.from / part.of) * 100), b = Math.round(((part.to - part.from) / part.of) * 100);
  const txt = done ? `Done ${hh(part.from)} → ${hh(part.to)}h of ${hh(part.of)}h`
    : part.from < 0.01 ? `Starts this task · ${hh(part.of)}h in total`
    : `Continues · ${hh(part.from)}h of ${hh(part.of)}h already done`;
  return `<div class="part"><span class="pbar"><i style="width:${a}%"></i><i class="cur" style="width:${b}%"></i></span><span>${txt}</span></div>`;
}
const resRow = (it) => { const h = resLinks(it); return h ? `<div class="resrow">${h}</div>` : ""; };

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
    <div class="txt"><span class="main">${esc(splitPart(it.text).title)}</span>${partHtml(splitPart(it.text).part, checked)}
      <div class="meta"><span class="tag">${label(it.track)}</span><span>${hh(it.hours)}h</span>${it.stretch ? '<span class="chip">stretch</span>' : ""}${dsa ? '<span class="small">tick it on Striver too</span>' : ""}</div>${resRow(it)}
    </div></li>`;
}
// A projected (future) item. Non-DSA items can be done early: ticking logs them as done today.
function projItemRow(it, date, i) {
  const can = S.canTickAhead(it);
  const lead = can
    ? `<button class="tick" role="checkbox" aria-checked="false" aria-label="Done it early" data-a="ahead" data-date="${date}" data-i="${i}">${CHECK}</button>`
    : `<span class="tick ghost" aria-hidden="true"><span class="dot t-${it.track}"></span></span>`;
  const note = it.track === "dsa" && !it.fixed ? '<span class="small">tick on Striver, then sync</span>' : it.fixed ? '<span class="small">on the day</span>' : "";
  return `<li class="item t-${it.track}">${lead}
    <div class="txt"><span class="main">${esc(splitPart(describe(it)).title)}</span>${partHtml(splitPart(describe(it)).part, false)}
    <div class="meta"><span class="tag">${label(it.track)}</span><span>${hh(it.hours)}h</span>${it.stretch ? '<span class="chip">stretch</span>' : ""}${note}</div>${resRow(it)}</div></li>`;
}

// Next 14 days after `t` (or the first 14 days of the plan before it starts). Exam/break runs are grouped.
function nextDaysCard(t, proj) {
  const end = addDays(t, 14);
  const days = proj.days.filter((d) => d.date > t && d.date <= end);
  if (!days.length) return "";
  const parts = [];
  for (let k = 0; k < days.length; k++) {
    const d = days[k];
    if (d.kind !== "study") {
      let j = k;
      while (j + 1 < days.length && days[j + 1].kind === d.kind && days[j + 1].label === d.label) j++;
      const range = j > k ? `${fmtShort(d.date)} – ${fmtShort(days[j].date)}` : fmtDay(d.date);
      const txt = d.kind === "blocked" ? `Blocked: ${d.label}` : d.label ? shortBlock({ label: d.label }) : "No plan";
      parts.push(`<div class="nd"><div class="row nd-h"><b>${range}</b><span class="chip">${esc(txt)}</span></div></div>`);
      k = j;
      continue;
    }
    const ev = d.events.length ? `<div class="pin small">📌 ${d.events.map(esc).join(" · ")}</div>` : "";
    parts.push(`<div class="nd"><div class="row nd-h"><b>${fmtDay(d.date)}</b><span class="muted small">${hh(d.planned)}h</span></div>${ev}
      ${d.items.length ? `<ul class="items">${d.items.map((it, i) => projItemRow(it, d.date, i)).join("")}</ul>` : '<p class="muted small" style="margin:4px 0">Nothing planned.</p>'}</div>`);
  }
  return `<div class="card"><div class="row"><h2 style="margin:0">Next 14 days</h2><span class="muted small">projected</span></div>
    <p class="muted small" style="margin:4px 0 6px">Free now? Do any Java, SQL, project or career item early and tick it here. It counts as done today and the rest of the plan moves up. DSA: solve on Striver, then sync.</p>
    ${parts.join("")}</div>`;
}

function aheadCard(t) {
  const list = state.ahead[t];
  if (!list || !list.length) return "";
  const hrs = list.reduce((a, x) => a + x.hours, 0);
  return `<div class="card"><div class="row"><h2 style="margin:0">Done ahead today</h2><span class="chip good">+${hh(hrs)}h</span></div>
    <ul class="items">${list.map((x, i) => `<li class="item done t-${x.track}">
      <button class="tick" role="checkbox" aria-checked="true" aria-label="Undo" data-a="unahead" data-date="${t}" data-i="${i}">${CHECK}</button>
      <div class="txt"><span class="main">${esc(splitPart(x.text).title)}</span>${partHtml(splitPart(x.text).part, true)}
      <div class="meta"><span class="tag">${label(x.track)}</span><span>${hh(x.hours)}h</span>${x.planned ? `<span class="small">was planned for ${fmtDay(x.planned)}</span>` : ""}</div>${resRow(x)}</div></li>`).join("")}</ul></div>`;
}
function statusChip(m) {
  if (m.status === "done") return '<span class="chip good">Done</span>';
  if (m.status === "on track") return '<span class="chip good">On track</span>';
  if (m.status === "late") return '<span class="chip bad">Late</span>';
  return '<span class="chip warn">At risk</span>';
}
function blockBanner(kind, text) {
  return `<div class="banner ${kind}"><b>${esc(text)}</b></div>`;
}

// ---------- progress numbers (shared by Today + Progress) ----------
function dsaTotals() {
  let solved = 0, total = 0, stretch = 0;
  for (const s of DSA_STEPS) {
    const n = Math.min(s.firstPass, s.done + (state.dsaDone[s.key] || 0));
    if (s.stretch) stretch += n; else { solved += n; total += s.firstPass; }
  }
  return { solved, total, stretch };
}
function progressRows() {
  const d = dsaTotals();
  const rows = [{ cls: "t-dsa", name: "DSA", done: d.solved, total: d.total, txt: `${d.solved} / ${d.total} problems${d.stretch ? ` · +${d.stretch} stretch` : ""}` }];
  for (const [tr, v] of Object.entries(S.trackTotals(state))) rows.push({ cls: `t-${tr}`, name: label(tr), done: v.done, total: v.total, txt: `${hh(v.done)} / ${hh(v.total)}h` });
  return rows;
}
function rowsHtml(rows) {
  return rows.map((r) => `<div class="prow"><div class="row small"><span class="${r.cls}"><span class="tag">${esc(r.name)}</span></span><span class="muted">${r.txt}</span></div>
    <div class="bar"><i class="${r.cls}" style="width:${Math.round((r.done / r.total) * 100)}%"></i></div></div>`).join("");
}
function progressMini() {
  return `<div class="card mini"><div class="row"><h2 style="margin:0">Your progress</h2><span class="muted small">${S.appsSent(state)} applications sent</span></div>
    <div style="margin-top:10px">${rowsHtml(progressRows())}</div>
    <button class="btn" data-a="nav" data-v="progress" style="margin-top:4px">Details</button></div>`;
}

// ---------- Today ----------
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

function hero(t, info, wk, userBlock) {
  const h = S.hourIST();
  const greet = h < 4 ? "Still up, Aarush?" : h < 12 ? "Good morning, Aarush" : h < 17 ? "Good afternoon, Aarush" : h < 22 ? "Good evening, Aarush" : "Good night, Aarush";
  const st = S.streak(state, t);
  const streakHtml = st.current > 0
    ? `<span class="streak" title="Days in a row you've done something. Exam, break and blocked days don't break it.">🔥 ${st.current}-day streak</span>${st.best > st.current ? `<span class="muted small">best ${st.best}</span>` : ""}`
    : `<span class="streak off">Tick one thing to start a streak</span>${st.best ? `<span class="muted small">best ${st.best}</span>` : ""}`;
  const [q, who] = quoteFor(t);
  const [, m, dd] = ymd(t);
  const tileKind = userBlock ? "blocked" : info.kind === "exam" ? "exam" : info.kind === "rest" ? "rest" : info.kind === "internship" ? "internship" : "study";
  return `<div class="hero">
    <div class="hero-top">
      <div class="caltile ${tileKind}" aria-label="${fmtDay(t)}"><span>${DOWN[dow(t)]}</span><b>${dd}</b><span>${MON[m - 1]}</span></div>
      <div><h1>${greet}</h1><div class="hero-meta">${streakHtml}${h < S.DAY_START_HOUR ? `<span class="chip night" title="The day switches at ${S.DAY_START_HOUR} am, so late-night work counts for the day you're on.">🌙 after midnight · counts as ${DOWN[dow(t)]} until ${S.DAY_START_HOUR} am</span>` : ""}</div></div>
    </div>
    <p class="status">${esc(statusLine(t, info, wk, userBlock))}</p>
    <p class="quote">“${esc(q)}”${who ? ` <span>— ${esc(who)}</span>` : ""}</p>
  </div>`;
}

function statusLine(t, info, wk, userBlock) {
  const parts = [];
  if (t < PLAN_START) parts.push(`Plan starts ${fmtDay(PLAN_START)}. CAT 2 comes first`);
  else if (t > PLAN_END) parts.push("The plan is finished. Well done");
  else if (userBlock) parts.push(`Day off: ${userBlock}. It won't count as behind`);
  else if (info.kind === "exam") {
    const paper = info.events.some((e) => /paper/i.test(e));
    const next = EVENTS.find((e) => e.date > t && /paper/i.test(e.label));
    parts.push(paper ? "Paper today. Best of luck 🍀" : next ? `Exam break. Next paper ${fmtDay(next.date)}` : "Exam period. The plan is paused");
  } else if (info.kind === "rest") parts.push("Break day. Enjoy it, no plan today");
  else if (info.kind === "internship") parts.push("Internship time. Good luck 💼");
  else if (info.kind === "study") {
    if (info.phase) parts.push(info.phase.name);
    const p = S.dayProgress(state, t);
    if (!p || !p.count) parts.push("Light day: nothing planned. Rest or get ahead");
    else if (p.doneCount === p.count) parts.push("All done for today 🎉");
    else if (p.doneCount) parts.push(`${p.count - p.doneCount} of ${p.count} items left, about ${hh(p.planned - p.done)}h`);
    else parts.push(`${p.count} item${p.count === 1 ? "" : "s"} today, about ${hh(p.planned)}h`);
    if (wk && wk.ahead > 0.5) parts.push(`you're ${hh(wk.ahead)}h ahead`);
    else if (wk && wk.multiplier > 1.01) parts.push(`a little catch-up till ${DOWN[dow(wk.end)]}`);
  }
  const ahead = (state.ahead[t] || []).reduce((a, x) => a + x.hours, 0);
  if (ahead) parts.push(`+${hh(ahead)}h done early today`);
  const exam = BLOCKS.find((b) => b.type === "exam" && b.from > t);
  if (exam && info.kind !== "exam") {
    const n = daysBetween(t, exam.from);
    if (n <= 21) parts.push(`${n} day${n === 1 ? "" : "s"} to ${shortBlock(exam).replace(/ \(.*\)/, "")}`);
  }
  const out = parts.join(" · ");
  return /[a-z0-9)]$/i.test(out) ? out + "." : out;
}
function viewToday(t) {
  const info = dayInfo(t);
  const userBlock = state.blocked[t];
  const wk = state.weeks[S.checkStartOf(t)];
  let html = hero(t, info, wk, userBlock);
  let left = "";

  if (t < PLAN_START) {
    const days = Math.round((Date.parse(PLAN_START) - Date.parse(t)) / 864e5);
    left += `<div class="banner exam"><b>Your plan starts ${fmtDay(PLAN_START)}</b>${days} day${days === 1 ? "" : "s"} to go. CAT 2 comes first. If you're free, you can get ahead on anything in the next 14 days below.</div>`;
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
  left += `<div class="only-mob">${progressMini(t)}</div>`;
  if (t >= PLAN_START && t <= PLAN_END && info.kind === "study" && !userBlock) {
    left += `<div class="btns"><button class="btn" data-a="block" data-date="${t}">Block today (hackathon / travel / sick)</button></div>`;
  }

  // work done early today + the next two weeks
  if (t <= PLAN_END) {
    left += `<div style="margin-top:14px">${aheadCard(t)}${nextDaysCard(t, S.project(state, t))}</div>`;
  }

  // right column
  let right = `<div class="only-desk">${progressMini(t)}</div>`;
  const cs = S.checkStartOf(t);
  if (wk && t >= PLAN_START && t <= PLAN_END) {
    let note = "On plan.";
    let chip = '<span class="chip good">On plan</span>';
    if (wk.rescope) { chip = '<span class="chip bad">Rescope</span>'; note = "You're well behind. Adding more hours won't fix it. Drop the stretch DSA topics or move the start of applications back a week."; }
    else if (wk.multiplier > 1.01) { chip = `<span class="chip warn">+${Math.round((wk.multiplier - 1) * 100)}% catch-up</span>`; note = `You were ${hh(wk.deficit)}h behind at this check, so the next few days carry a little more work (never more than +25%).`; }
    else if (wk.ahead > 0.5) { chip = `<span class="chip good">${hh(wk.ahead)}h ahead</span>`; note = "You're ahead. The plan picks up from where you actually are, so nothing is repeated."; }
    const boosts = Object.keys(wk.boosts || {}).map(label).join(", ");
    right += `<div class="card"><div class="row"><h2 style="margin:0">Check: ${DOWN[dow(cs)]} ${fmtShort(cs)} – ${DOWN[dow(wk.end || cs)]} ${fmtShort(wk.end || cs)}</h2>${chip}</div>
      <p class="muted small" style="margin:4px 0 0">Progress is checked every Monday and Thursday.</p>
      <p class="small" style="margin:8px 0 0">${esc(note)}</p>
      ${boosts ? `<p class="small muted" style="margin:6px 0 0">Priority: ${esc(boosts)} (a milestone is behind)</p>` : ""}
      ${dow(t) === 0 || dow(t) === 3 ? '<p class="small pin" style="margin:8px 0 0">Sync your Striver progress today so tomorrow\'s check is right.</p><div class="btns" style="margin-top:6px"><button class="btn primary" data-a="nav" data-v="sync">Sync now</button></div>' : ""}</div>`;
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
      ? `<ul class="items">${day.items.map((it, i) => projItemRow(it, date, i)).join("")}</ul><p class="muted small" style="margin:6px 0 0">Projected. It updates as you make progress. Ticking an item here logs it as done today.</p>`
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
  const trackRows = rowsHtml(progressRows());
  const weeks = Object.entries(state.weeks).sort(([a], [b]) => b.localeCompare(a)).slice(0, 10);
  return `<h1>Progress</h1>
    <p class="sub">${sheet ? `Striver sheet: <b>${sheet.overall ? sheet.overall[0] + " / " + sheet.overall[1] : "synced"}</b> solved · last sync ${new Date(sheet.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : 'Striver sheet not synced yet. <a href="#" data-a="nav" data-v="sync">Set it up</a>'}</p>
    <div class="card"><h2>Milestones</h2><div class="scroll"><table><thead><tr><th>Milestone</th><th>Target</th><th>Projected</th><th></th></tr></thead><tbody>
      ${ms.map((m) => `<tr><td>${esc(m.label)}</td><td>${fmtShort(m.target)}</td><td>${m.projected && m.projected !== "done" ? fmtShort(m.projected) : m.projected === "done" ? "done" : "not by April"}</td><td>${statusChip(m)}</td></tr>`).join("")}
    </tbody></table></div></div>
    <div class="grid2" style="grid-template-columns:1fr 1fr">
      <div class="card"><h2>DSA: first pass</h2>${stepRows}<p class="muted small" style="margin:0">Hard problems are skipped on the first pass.</p></div>
      <div><div class="card"><h2>Done by track</h2>${trackRows}
        <div class="row small" style="margin-top:4px"><span><b>Applications sent</b></span><span class="stat" style="font-size:20px">${apps}</span></div></div>
      ${weeks.length ? `<div class="card"><h2>Re-plan checks (Mon + Thu)</h2><div class="scroll"><table><thead><tr><th>Check</th><th>Behind</th><th>Next days</th></tr></thead><tbody>
        ${weeks.map(([m, w]) => `<tr><td>${DOWN[dow(m)]} ${fmtShort(m)}</td><td>${w.deficit > 0.25 ? hh(w.deficit) + "h" : "–"}</td><td>${w.rescope ? "rescope" : w.multiplier > 1.01 ? "+" + Math.round((w.multiplier - 1) * 100) + "%" : "normal"}</td></tr>`).join("")}</tbody></table></div></div>` : ""}</div>
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
  if (a === "ahead") {
    const day = S.project(state, t).days.find((d) => d.date === el.dataset.date);
    const it = day && day.items[+el.dataset.i];
    if (it && S.tickAhead(state, t, it, el.dataset.date)) {
      save(); render();
      const next = it.id && S.project(state, t).days.find((d) => d.items.some((x) => x.id === it.id));
      toast(next ? `Done early. The next part of this task is now on ${fmtDay(next.date)}.` : "Done early. Logged for today and the plan moved up.");
    }
    return;
  }
  if (a === "unahead") { S.untickAhead(state, el.dataset.date, +el.dataset.i); save(); render(); return; }
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
