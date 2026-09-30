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
      let budget = (fr.planned / ((st.weeks[S.mondayOf(d)] || {}).multiplier || 1)) * ratioFor(d); // fixed real capacity
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
