// Striver A2Z sync. The bookmarklet runs ON takeuforward.org (using your own login, in your own
// browser), reads the "done/total" counter next to each step name, and opens this site with the
// numbers in the URL fragment. Nothing is sent to any server.

export const ALL_STEP_NAMES = [
  "Beginner Problems", "Sorting", "Arrays", "Hashing", "Binary Search", "Strings (Basic and Medium)",
  "Recursion", "Linked-List", "Bit Manipulation", "Greedy Algorithms", "Sliding Window / 2 Pointer",
  "Stack / Queues", "Binary Trees", "Binary Search Trees", "Heaps", "Graphs", "Dynamic Programming",
  "Tries", "Strings (Advanced Algo)", "Maths",
];

// Must stay self-contained (no imports/closures): it is serialised into a javascript: URL.
export function bookmarkletMain(ORIGIN, NAMES) {
  function norm(s) { return (s || "").replace(/\s+/g, " ").trim(); }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  var out = { v: 1, t: Date.now(), overall: null, steps: {} };
  var all = document.body.querySelectorAll("*");
  var cands = [];
  for (var i = 0; i < all.length; i++) {
    var tc = all[i].textContent;
    if (tc && tc.length > 4 && tc.length < 80 && all[i].children.length < 8) cands.push(norm(tc));
  }
  var m = norm(document.body.innerText).match(/(\d+)\s*\/\s*(\d+)\s*problems solved/i);
  if (m) out.overall = [+m[1], +m[2]];
  NAMES.forEach(function (n) {
    var pat = n.split("/").map(function (p) { return esc(norm(p)); }).join("\\s*/\\s*");
    var re = new RegExp("^\\W*" + pat + "\\s*(\\d+)\\s*/\\s*(\\d+)(?!\\d)", "i");
    for (var j = 0; j < cands.length; j++) {
      var mm = cands[j].match(re);
      if (mm) { out.steps[n] = [+mm[1], +mm[2]]; break; }
    }
  });
  var found = Object.keys(out.steps).length;
  if (!found) {
    alert("PrepPilot: couldn't find the step counters. Open the A2Z sheet page (…/strivers-a2z-dsa-sheet?page=sheet) and try again.");
    return;
  }
  var json = JSON.stringify(out);
  var b64 = btoa(unescape(encodeURIComponent(json))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  var w = window.open(ORIGIN + "/#sync=" + b64, "_blank");
  if (!w) {
    try { navigator.clipboard.writeText(json); } catch (e) {}
    prompt("Popup blocked. Copy this and paste it into the Sync page:", json);
    return;
  }
  var t = document.createElement("div");
  t.textContent = "PrepPilot: sent " + found + " of " + NAMES.length + " steps";
  t.style.cssText = "position:fixed;z-index:99999;right:16px;bottom:16px;padding:10px 14px;background:#111;color:#fff;border-radius:8px;font:14px system-ui";
  document.body.appendChild(t);
  setTimeout(function () { t.remove(); }, 2500);
}

export function bookmarkletHref(origin) {
  const code = `(${bookmarkletMain.toString()})(${JSON.stringify(origin)},${JSON.stringify(ALL_STEP_NAMES)})`;
  return "javascript:" + encodeURIComponent(code);
}
