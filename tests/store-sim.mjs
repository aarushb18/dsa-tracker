import * as S from "../store.js";
import { addDays } from "../planner/scheduler.js";

function run(name, ratioFor, until = "2027-04-16") {
  const st = S.freshState();
  let log = [];
  for (let d = "2026-09-30"; d <= until; d = addDays(d, 1)) {
    const w = S.ensureWeek(st, d);
    const fr = S.ensureDay(st, d);
    if (fr) {
      // tick items in order until the day's budget (ratio * planned) is used
      let budget = (fr.planned / ((st.weeks[S.checkStartOf(d)] || {}).multiplier || 1)) * ratioFor(d); // fixed real capacity
      fr.items.forEach((it, i) => { if (budget >= it.hours * 0.5) { S.toggleItem(st, d, i); budget -= it.hours; } });
    }
    if (w && w.at === d && w.multiplier !== 1) log.push(`${d}: x${w.multiplier.toFixed(2)} deficit ${w.deficit.toFixed(1)} rescope=${w.rescope}`);
  }
  const ms = S.liveMilestones(st, until);
  const solved = 38 + Object.values(st.dsaDone).reduce((a, b) => a + b, 0);
  console.log(`\n== ${name}: work done ${S.workDone(st).toFixed(0)}h, solved ${solved}`);
  console.log(ms.map((m) => `${m.label.slice(0, 30).padEnd(30)} target ${m.target} → ${m.projected || "—"} (${m.status})`).join("\n"));
  console.log("catch-up weeks:", log.slice(0, 4).join(" | "), log.length > 4 ? `… (${log.length} total)` : "");
  return st;
}
run("100% effort", () => 1);
run("80% effort", () => 0.8);
run("alternating 140%/50%", (d) => (Math.floor((Date.parse(d) - Date.parse("2026-10-05")) / 6048e5) % 2 ? 0.5 : 1.4));

// Work ahead: on 30 Sep, do the first two non-DSA items from the next 14 days early.
{
  const st = S.freshState();
  const t = "2026-09-30";
  const firstIds = () => S.project(st, t).days.flatMap((d) => d.items.map((it, i) => ({ d: d.date, i, it }))).filter((x) => S.canTickAhead(x.it));
  const picks = firstIds().slice(0, 2);
  for (const p of picks) {
    const day = S.project(st, t).days.find((d) => d.date === p.d);
    const idx = day.items.findIndex((it) => it.id === p.it.id);
    S.tickAhead(st, t, day.items[idx], p.d);
  }
  const hrs = st.ahead[t].reduce((a, x) => a + x.hours, 0);
  const still = firstIds().filter((x) => picks.some((p) => p.it.id === x.it.id && p.d === x.d && p.it.part?.from === x.it.part?.from));
  const wk = S.ensureWeek(st, "2026-10-05");
  console.log(`\n== work ahead: ticked ${st.ahead[t].map((x) => x.id).join(", ")} (${hrs}h) on ${t}`);
  console.log(`   same items still projected on the same days: ${still.length}; week of 5 Oct ahead by ${wk.ahead.toFixed(2)}h, multiplier ${wk.multiplier}`);
  S.untickAhead(st, t, 0); S.untickAhead(st, t, 0);
  console.log(`   after undo: tasks=${JSON.stringify(st.tasks)} ahead=${JSON.stringify(st.ahead)}`);
}

// Streak + 4 am day boundary
{
  const st = S.freshState();
  const at = (iso) => S.todayIST(new Date(iso));
  console.log("\n== day boundary:", at("2026-10-05T18:59:00Z"), "(00:29 IST on 6 Oct → still 5 Oct)", at("2026-10-05T22:31:00Z"), "(04:01 IST → 6 Oct)");
  const tick = (d) => { S.ensureDay(st, d); S.toggleItem(st, d, 0); };
  st.ahead["2026-09-30"] = [{ id: "java-01", track: "java", text: "x", hours: 0.75 }]; // did work early before the plan
  ["2026-10-05", "2026-10-06", "2026-10-07"].forEach(tick); // 1–4 Oct are CAT 2 → paused, not broken
  console.log("   streak on 7 Oct:", JSON.stringify(S.streak(st, "2026-10-07")), "(expect 4)");
  console.log("   streak on 8 Oct before ticking:", S.streak(st, "2026-10-08").current, "(today never breaks it → 4)");
  console.log("   streak on 9 Oct after missing 8 Oct:", S.streak(st, "2026-10-09").current, "best", S.streak(st, "2026-10-09").best, "(expect 0, best 4)");
  S.toggleBlock(st, "2026-10-08", "Sick");
  console.log("   same, but 8 Oct blocked:", S.streak(st, "2026-10-09").current, "(expect 4)");
}
